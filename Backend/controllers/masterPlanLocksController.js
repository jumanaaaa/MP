// controllers/masterPlanLocksController.js
const { sql, getPool } = require("../db/pool");
// ==================== CONFIGURATION ====================
const LOCK_TIMEOUT_MINUTES = 5; // Lock expires after 5 minutes of inactivity
const HEARTBEAT_INTERVAL_SECONDS = 30; // Client should heartbeat every 30 seconds

// ==================== ACQUIRE LOCK ====================
exports.acquireLock = async (req, res) => {
  const { planId } = req.params;
  const userId = req.user.id;
  const { sessionId, lockType = 'editing' } = req.body;

  console.log(`🔒 Attempting to acquire ${lockType} lock on plan ${planId} for user ${userId}`);

  try {
    const pool = await getPool();

    // Step 1: Check if plan exists
    const planCheck = pool.request();
    planCheck.input("planId", sql.Int, planId);
    const planExists = await planCheck.query(`
      SELECT Id, Project FROM MasterPlan WHERE Id = @planId
    `);

    if (planExists.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Plan not found" 
      });
    }

      // Step 1.5: 🆕 CHECK PERMISSION (between Step 1 and Step 2)
      const permCheck = pool.request();
      permCheck.input("planId", sql.Int, planId);
      permCheck.input("userId", sql.Int, userId);

      const hasPermission = await permCheck.query(`
  SELECT PermissionLevel 
  FROM MasterPlanPermissions
  WHERE MasterPlanId = @planId AND UserId = @userId
`);

      if (hasPermission.recordset.length === 0) {
          console.log(`❌ User ${userId} has no permission for plan ${planId}`);
          return res.status(403).json({
              success: false,
              error: 'You do not have permission to edit this plan'
          });
      }

      const userPermission = hasPermission.recordset[0].PermissionLevel;

      // Only editor and owner can acquire locks
      if (userPermission === 'viewer') {
          console.log(`❌ User ${userId} is viewer, cannot edit plan ${planId}`);
          return res.status(403).json({
              success: false,
              error: 'Viewers cannot edit plans. Editor permission required.'
          });
      }

      console.log(`✅ User ${userId} has ${userPermission} permission`);

    // Step 2: Check for existing locks
    const lockCheck = pool.request();
    lockCheck.input("planId", sql.Int, planId);
    lockCheck.input("now", sql.DateTime, new Date());
    
    const existingLocks = await lockCheck.query(`
      SELECT 
        l.Id, l.UserId, l.LockedAt, l.LastActivity, l.ExpiresAt, l.LockType,
        u.FirstName, u.LastName, u.Email
      FROM MasterPlanLocks l
      INNER JOIN Users u ON l.UserId = u.Id
      WHERE l.MasterPlanId = @planId 
        AND l.ExpiresAt > @now
    `);

    // Step 3: Handle existing locks
    if (existingLocks.recordset.length > 0) {
      const existingLock = existingLocks.recordset[0];
      
      // If same user, update their lock (tab refresh case)
      if (existingLock.UserId === userId) {
        console.log(`🔄 User ${userId} already has lock, refreshing...`);
        
        const updateLock = pool.request();
        updateLock.input("lockId", sql.Int, existingLock.Id);
        updateLock.input("now", sql.DateTime, new Date());
        updateLock.input("expiresAt", sql.DateTime, new Date(Date.now() + LOCK_TIMEOUT_MINUTES * 60000));
        
        await updateLock.query(`
          UPDATE MasterPlanLocks
          SET LastActivity = @now, ExpiresAt = @expiresAt
          WHERE Id = @lockId
        `);

        return res.status(200).json({
          success: true,
          message: "Lock refreshed",
          lock: {
            lockId: existingLock.Id,
            userId: userId,
            lockedBy: `${req.user.name}`,
            lockedAt: existingLock.LockedAt,
            expiresAt: new Date(Date.now() + LOCK_TIMEOUT_MINUTES * 60000)
          }
        });
      }

      // Different user has lock - return lock info
      console.log(`❌ Plan ${planId} is locked by user ${existingLock.UserId}`);
      
      return res.status(423).json({ // 423 Locked
        success: false,
        locked: true,
        lock: {
          userId: existingLock.UserId,
          lockedBy: `${existingLock.FirstName} ${existingLock.LastName}`,
          email: existingLock.Email,
          lockedAt: existingLock.LockedAt,
          lastActivity: existingLock.LastActivity,
          expiresAt: existingLock.ExpiresAt,
          lockType: existingLock.LockType
        }
      });
    }

    // Step 4: Create new lock
    const createLock = pool.request();
    createLock.input("planId", sql.Int, planId);
    createLock.input("userId", sql.Int, userId);
    createLock.input("lockType", sql.NVarChar, lockType);
    createLock.input("sessionId", sql.NVarChar, sessionId || null);
    createLock.input("expiresAt", sql.DateTime, new Date(Date.now() + LOCK_TIMEOUT_MINUTES * 60000));

    const result = await createLock.query(`
      INSERT INTO MasterPlanLocks (MasterPlanId, UserId, LockType, SessionId, ExpiresAt)
      OUTPUT INSERTED.Id, INSERTED.LockedAt, INSERTED.ExpiresAt
      VALUES (@planId, @userId, @lockType, @sessionId, @expiresAt)
    `);

    const newLock = result.recordset[0];
    console.log(`✅ Lock ${newLock.Id} acquired for plan ${planId} by user ${userId}`);

    res.status(200).json({
      success: true,
      message: "Lock acquired successfully",
      lock: {
        lockId: newLock.Id,
        userId: userId,
        lockedBy: req.user.name,
        lockedAt: newLock.LockedAt,
        expiresAt: newLock.ExpiresAt,
        lockType: lockType
      }
    });

  } catch (err) {
    console.error("❌ Acquire lock error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to acquire lock",
      details: err.message 
    });
  }
};

// ==================== RELEASE LOCK ====================
exports.releaseLock = async (req, res) => {
  const { planId } = req.params;
  const userId = req.user.id;

  console.log(`🔓 Releasing lock on plan ${planId} for user ${userId}`);

  try {
    const pool = await getPool();

    const deleteLock = pool.request();
    deleteLock.input("planId", sql.Int, planId);
    deleteLock.input("userId", sql.Int, userId);

    const result = await deleteLock.query(`
      DELETE FROM MasterPlanLocks
      WHERE MasterPlanId = @planId AND UserId = @userId
    `);

    if (result.rowsAffected[0] === 0) {
      console.log(`⚠️ No lock found to release for plan ${planId}, user ${userId}`);
      return res.status(404).json({ 
        success: false, 
        message: "No lock found to release" 
      });
    }

    console.log(`✅ Lock released for plan ${planId}`);
    res.status(200).json({ 
      success: true, 
      message: "Lock released successfully" 
    });

  } catch (err) {
    console.error("❌ Release lock error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to release lock",
      details: err.message 
    });
  }
};

// ==================== HEARTBEAT (KEEP LOCK ALIVE) ====================
exports.heartbeat = async (req, res) => {
  const { planId } = req.params;
  const userId = req.user.id;

  try {
    const pool = await getPool();

    const updateLock = pool.request();
    updateLock.input("planId", sql.Int, planId);
    updateLock.input("userId", sql.Int, userId);
    updateLock.input("now", sql.DateTime, new Date());
    updateLock.input("expiresAt", sql.DateTime, new Date(Date.now() + LOCK_TIMEOUT_MINUTES * 60000));

    const result = await updateLock.query(`
      UPDATE MasterPlanLocks
      SET LastActivity = @now, ExpiresAt = @expiresAt
      WHERE MasterPlanId = @planId AND UserId = @userId
    `);

    if (result.rowsAffected[0] === 0) {
      console.log(`⚠️ Heartbeat failed - lock not found for plan ${planId}, user ${userId}`);
      return res.status(404).json({ 
        success: false, 
        lockLost: true,
        message: "Lock expired or released" 
      });
    }

    // Don't log every heartbeat to avoid spam
    res.status(200).json({ 
      success: true, 
      message: "Lock refreshed",
      expiresAt: new Date(Date.now() + LOCK_TIMEOUT_MINUTES * 60000)
    });

  } catch (err) {
    console.error("❌ Heartbeat error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Heartbeat failed",
      details: err.message 
    });
  }
};

// ==================== CHECK LOCK STATUS ====================
exports.getLockStatus = async (req, res) => {
  const { planId } = req.params;

  try {
    const pool = await getPool();

    const checkLock = pool.request();
    checkLock.input("planId", sql.Int, planId);
    checkLock.input("now", sql.DateTime, new Date());

    const result = await checkLock.query(`
      SELECT 
        l.Id, l.UserId, l.LockedAt, l.LastActivity, l.ExpiresAt, l.LockType,
        u.FirstName, u.LastName, u.Email
      FROM MasterPlanLocks l
      INNER JOIN Users u ON l.UserId = u.Id
      WHERE l.MasterPlanId = @planId AND l.ExpiresAt > @now
    `);

    if (result.recordset.length === 0) {
      return res.status(200).json({
        success: true,
        locked: false,
        message: "Plan is not locked"
      });
    }

    const lock = result.recordset[0];
    const isOwnLock = lock.UserId === req.user.id;

    res.status(200).json({
      success: true,
      locked: true,
      isOwnLock: isOwnLock,
      lock: {
        lockId: lock.Id,
        userId: lock.UserId,
        lockedBy: `${lock.FirstName} ${lock.LastName}`,
        email: lock.Email,
        lockedAt: lock.LockedAt,
        lastActivity: lock.LastActivity,
        expiresAt: lock.ExpiresAt,
        lockType: lock.LockType,
        minutesRemaining: Math.floor((new Date(lock.ExpiresAt) - new Date()) / 60000)
      }
    });

  } catch (err) {
    console.error("❌ Check lock status error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to check lock status",
      details: err.message 
    });
  }
};

// ==================== TAKEOVER LOCK ====================
exports.takeoverLock = async (req, res) => {
  const { planId } = req.params;
  const userId = req.user.id;
  const { force = false } = req.body;

  console.log(`⚠️ User ${userId} attempting to takeover lock on plan ${planId} (force: ${force})`);

  try {
    const pool = await getPool();

    // Check existing lock
    const checkLock = pool.request();
    checkLock.input("planId", sql.Int, planId);
    checkLock.input("now", sql.DateTime, new Date());

    const existingLocks = await checkLock.query(`
      SELECT 
        l.Id, l.UserId, l.LastActivity,
        u.FirstName, u.LastName
      FROM MasterPlanLocks l
      INNER JOIN Users u ON l.UserId = u.Id
      WHERE l.MasterPlanId = @planId AND l.ExpiresAt > @now
    `);

    if (existingLocks.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "No active lock to takeover" 
      });
    }

    const existingLock = existingLocks.recordset[0];

    // Check if lock is inactive (optional: only allow takeover if user is inactive)
    const inactiveMinutes = (new Date() - new Date(existingLock.LastActivity)) / 60000;
    
    if (!force && inactiveMinutes < 2) {
      return res.status(403).json({
        success: false,
        message: `User ${existingLock.FirstName} ${existingLock.LastName} is actively editing (last activity ${inactiveMinutes.toFixed(1)} min ago)`,
        requiresForce: true
      });
    }

    // Delete old lock
    const deleteLock = pool.request();
    deleteLock.input("lockId", sql.Int, existingLock.Id);
    await deleteLock.query(`DELETE FROM MasterPlanLocks WHERE Id = @lockId`);

    // Create new lock
    const createLock = pool.request();
    createLock.input("planId", sql.Int, planId);
    createLock.input("userId", sql.Int, userId);
    createLock.input("expiresAt", sql.DateTime, new Date(Date.now() + LOCK_TIMEOUT_MINUTES * 60000));

    const result = await createLock.query(`
      INSERT INTO MasterPlanLocks (MasterPlanId, UserId, LockType, ExpiresAt)
      OUTPUT INSERTED.Id, INSERTED.LockedAt, INSERTED.ExpiresAt
      VALUES (@planId, @userId, 'editing', @expiresAt)
    `);

    const newLock = result.recordset[0];
    console.log(`✅ Lock takeover successful - plan ${planId} now locked by user ${userId}`);

    res.status(200).json({
      success: true,
      message: "Lock taken over successfully",
      lock: {
        lockId: newLock.Id,
        userId: userId,
        lockedBy: req.user.name,
        lockedAt: newLock.LockedAt,
        expiresAt: newLock.ExpiresAt
      }
    });

  } catch (err) {
    console.error("❌ Takeover lock error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to takeover lock",
      details: err.message 
    });
  }
};

// ==================== GET ALL ACTIVE LOCKS ====================
exports.getActiveLocks = async (req, res) => {
  try {
    const pool = await getPool();

    const getAll = pool.request();
    getAll.input("now", sql.DateTime, new Date());

    const result = await getAll.query(`
      SELECT 
        l.Id, l.MasterPlanId, l.UserId, l.LockedAt, l.LastActivity, 
        l.ExpiresAt, l.LockType,
        mp.Project,
        u.FirstName, u.LastName, u.Email
      FROM MasterPlanLocks l
      INNER JOIN MasterPlan mp ON l.MasterPlanId = mp.Id
      INNER JOIN Users u ON l.UserId = u.Id
      WHERE l.ExpiresAt > @now
      ORDER BY l.LockedAt DESC
    `);

    const locks = result.recordset.map(lock => ({
      lockId: lock.Id,
      planId: lock.MasterPlanId,
      planName: lock.Project,
      userId: lock.UserId,
      lockedBy: `${lock.FirstName} ${lock.LastName}`,
      email: lock.Email,
      lockedAt: lock.LockedAt,
      lastActivity: lock.LastActivity,
      expiresAt: lock.ExpiresAt,
      lockType: lock.LockType,
      minutesRemaining: Math.floor((new Date(lock.ExpiresAt) - new Date()) / 60000)
    }));

    res.status(200).json({
      success: true,
      count: locks.length,
      locks: locks
    });

  } catch (err) {
    console.error("❌ Get active locks error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch active locks",
      details: err.message 
    });
  }
};

// ==================== CLEANUP EXPIRED LOCKS ====================
exports.cleanupExpiredLocks = async (req, res) => {
  console.log("🧹 Cleaning up expired locks...");

  try {
    const pool = await getPool();

    const cleanup = pool.request();
    cleanup.input("now", sql.DateTime, new Date());

    const result = await cleanup.query(`
      DELETE FROM MasterPlanLocks WHERE ExpiresAt <= @now
    `);

    console.log(`✅ Cleaned up ${result.rowsAffected[0]} expired locks`);

    res.status(200).json({
      success: true,
      message: "Expired locks cleaned up",
      deletedCount: result.rowsAffected[0]
    });

  } catch (err) {
    console.error("❌ Cleanup error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Cleanup failed",
      details: err.message 
    });
  }
};