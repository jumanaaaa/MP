const { sql, config } = require("../db");

/**
 * Check if user has required permission level for a master plan
 * @param {string} requiredLevel - 'owner', 'editor', or 'viewer'
 * @returns {Function} Express middleware
 */
function checkPlanPermission(requiredLevel) {
  return async (req, res, next) => {
    const { id: planId } = req.params;
    const userId = req.user.id;

    console.log(`🔐 Checking ${requiredLevel} permission for user ${userId} on plan ${planId}`);

    try {
      await sql.connect(config);

      // Check if user has permission
      const checkPerm = new sql.Request();
      checkPerm.input("planId", sql.Int, planId);
      checkPerm.input("userId", sql.Int, userId);

      const result = await checkPerm.query(`
        SELECT PermissionLevel 
        FROM MasterPlanPermissions
        WHERE MasterPlanId = @planId AND UserId = @userId
      `);

      // No permission found
      if (result.recordset.length === 0) {
        console.log(`❌ User ${userId} has no permission for plan ${planId}`);
        return res.status(403).json({ 
          error: 'You do not have permission to access this plan' 
        });
      }

      const userPermission = result.recordset[0].PermissionLevel;

      // Permission hierarchy: owner (3) > editor (2) > viewer (1)
      const permissionLevels = {
        'viewer': 1,
        'editor': 2,
        'owner': 3
      };

      const required = permissionLevels[requiredLevel];
      const current = permissionLevels[userPermission];

      if (current < required) {
        console.log(`❌ User ${userId} has ${userPermission} but needs ${requiredLevel}`);
        return res.status(403).json({ 
          error: `${requiredLevel} permission required. You have ${userPermission} access.` 
        });
      }

      console.log(`✅ User ${userId} has ${userPermission} permission (requires ${requiredLevel})`);
      req.userPermission = userPermission;
      next();

    } catch (error) {
      console.error('❌ Permission check error:', error);
      res.status(500).json({ 
        error: 'Permission check failed',
        details: error.message 
      });
    }
  };
}

module.exports = checkPlanPermission;