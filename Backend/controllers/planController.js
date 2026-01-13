const { sql, getPool } = require("../db/pool"); const nodemailer = require('nodemailer');
const { logNotification } = require("../utils/notificationLogger");

// ===================== CREATE =====================
exports.createMasterPlan = async (req, res) => {
  const { project, projectType, startDate, endDate, fields, permissions } = req.body;
  const creatorId = req.user.id;

  if (!project || !startDate || !endDate) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    // STEP 1: Insert into MasterPlan
    const planRequest = new sql.Request(transaction);
    planRequest.input("Project", sql.NVarChar, project);
    planRequest.input("ProjectType", sql.NVarChar, projectType || 'General');
    planRequest.input("StartDate", sql.Date, startDate);
    planRequest.input("EndDate", sql.Date, endDate);
    planRequest.input("UserId", sql.Int, creatorId);
    planRequest.input("ApprovalStatus", sql.NVarChar, 'Pending Approval');

    const planResult = await planRequest.query(`
      INSERT INTO MasterPlan (Project, ProjectType, StartDate, EndDate, UserId, ApprovalStatus)
      OUTPUT INSERTED.Id
      VALUES (@Project, @ProjectType, @StartDate, @EndDate, @UserId, @ApprovalStatus)
    `);

    const masterPlanId = planResult.recordset[0].Id;
    console.log(`✅ Created MasterPlan with ID: ${masterPlanId}, Type: ${projectType}`);

    // STEP 2: Insert dynamic fields (milestones)
    if (fields && typeof fields === "object") {
      for (const [fieldName, fieldData] of Object.entries(fields)) {
        const fieldRequest = new sql.Request(transaction);
        fieldRequest.input("MasterPlanId", sql.Int, masterPlanId);
        fieldRequest.input("FieldName", sql.NVarChar, fieldName);
        fieldRequest.input("FieldValue", sql.NVarChar, fieldData.status || "");
        fieldRequest.input("StartDate", sql.Date, fieldData.startDate || null);
        fieldRequest.input("EndDate", sql.Date, fieldData.endDate || null);

        await fieldRequest.query(`
          INSERT INTO MasterPlanFields (MasterPlanId, FieldName, FieldValue, StartDate, EndDate)
          VALUES (@MasterPlanId, @FieldName, @FieldValue, @StartDate, @EndDate)
        `);

        console.log(`   📊 Added field: ${fieldName} (${fieldData.startDate} - ${fieldData.endDate})`);
      }
    }

    // STEP 3: INSERT PERMISSIONS
    // Always add creator as owner first
    const ownerPerm = new sql.Request(transaction);
    ownerPerm.input("MasterPlanId", sql.Int, masterPlanId);
    ownerPerm.input("UserId", sql.Int, creatorId);
    ownerPerm.input("PermissionLevel", sql.NVarChar, 'owner');
    ownerPerm.input("GrantedBy", sql.Int, creatorId);

    await ownerPerm.query(`
      INSERT INTO MasterPlanPermissions (MasterPlanId, UserId, PermissionLevel, GrantedBy)
      VALUES (@MasterPlanId, @UserId, @PermissionLevel, @GrantedBy)
    `);

    console.log(`   🔑 Added owner permission for user ${creatorId}`);

    // Add additional team members if provided
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      for (const perm of permissions) {
        const permRequest = new sql.Request(transaction);
        permRequest.input("MasterPlanId", sql.Int, masterPlanId);
        permRequest.input("UserId", sql.Int, perm.userId);
        permRequest.input("PermissionLevel", sql.NVarChar, perm.permissionLevel);
        permRequest.input("GrantedBy", sql.Int, creatorId);

        await permRequest.query(`
          INSERT INTO MasterPlanPermissions (MasterPlanId, UserId, PermissionLevel, GrantedBy)
          VALUES (@MasterPlanId, @UserId, @PermissionLevel, @GrantedBy)
        `);

        console.log(`   🔑 Added ${perm.permissionLevel} permission for user ${perm.userId}`);
      }
    }

    await transaction.commit();
    console.log(`✅ Master Plan "${project}" created with ${permissions?.length || 0} team members!`);

    // 🆕 AUTO-CREATE AI CONTEXT (NAME ONLY)
    try {
      // 1️⃣ Get department domain ID
      const domainResult = await pool.request()
        .input("department", sql.NVarChar, req.user.department)
        .query(`SELECT Id FROM Domains WHERE Name = @department`);

      let domainId;
      if (domainResult.recordset.length === 0) {
        // Create domain if it doesn't exist
        const domainInsert = await pool.request()
          .input("Name", sql.NVarChar, req.user.department)
          .input("Description", sql.NVarChar, `${req.user.department} Department`)
          .query(`
        INSERT INTO Domains (Name, Description)
        OUTPUT INSERTED.Id
        VALUES (@Name, @Description)
      `);
        domainId = domainInsert.recordset[0].Id;
      } else {
        domainId = domainResult.recordset[0].Id;
      }

      // 2️⃣ Check if context already exists
      const existingContext = await pool.request()
        .input("Name", sql.NVarChar, project)
        .input("DomainId", sql.Int, domainId)
        .query(`
      SELECT Id FROM Contexts 
      WHERE Name = @Name AND DomainId = @DomainId
    `);

      if (existingContext.recordset.length === 0) {
        // 3️⃣ Create empty context (name only)
        await pool.request()
          .input("DomainId", sql.Int, domainId)
          .input("Name", sql.NVarChar, project)
          .input("Purpose", sql.NVarChar, '')
          .input("AiContext", sql.NVarChar, '')
          .input("ProjectType", sql.NVarChar, projectType || 'Project')
          .query(`
        INSERT INTO Contexts (DomainId, Name, Purpose, AiContext, ProjectType)
        VALUES (@DomainId, @Name, @Purpose, @AiContext, @ProjectType)
      `);

        console.log(`🤖 Auto-created AI Context: "${project}" (empty - admin can fill later)`);
      } else {
        console.log(`ℹ️ AI Context "${project}" already exists - skipping creation`);
      }
    } catch (contextError) {
      // Non-blocking: don't fail the master plan creation if context creation fails
      console.error('⚠️ Failed to auto-create AI Context (non-blocking):', contextError.message);
    }

    // ✅ CALL EMAIL FUNCTION DIRECTLY (no HTTP fetch)
    try {
      await sendApprovalRequestEmail({
        planId: masterPlanId,
        projectName: project,
        submittedBy: req.user.firstName && req.user.lastName
          ? `${req.user.firstName} ${req.user.lastName}`
          : req.user.email,
        submittedByEmail: req.user.email,
        changeType: 'new'
      });
    } catch (emailError) {
      console.error('⚠️ Failed to send approval email (non-blocking):', emailError.message);
    }

    res.status(201).json({
      message: "Master Plan created successfully and submitted for approval!",
      planId: masterPlanId,
      approvalStatus: "Pending Approval"
    });

  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error("Create Master Plan Error:", err);
    res.status(500).json({ message: "Failed to create master plan", error: err.message });
  }
};

// ===================== READ (WITH DEPARTMENT FILTERING) =====================
exports.getMasterPlans = async (req, res) => {
  const currentUserId = req.user.id;
  const currentUserDepartment = req.user.department;

  try {
    const pool = await getPool();

    const request = pool.request();
    request.input("userId", sql.Int, currentUserId);
    request.input("userDept", sql.NVarChar, currentUserDepartment);

    const result = await request.query(`
      SELECT DISTINCT
        mp.Id, 
        mp.Project, 
        mp.ProjectType, 
        mp.StartDate, 
        mp.EndDate, 
        mp.CreatedAt, 
        mp.UserId,
        mp.ApprovalStatus,
        f.Id as FieldId,
        f.FieldName, 
        f.FieldValue, 
        f.StartDate as FieldStartDate, 
        f.EndDate as FieldEndDate
      FROM MasterPlan mp
      LEFT JOIN MasterPlanFields f ON mp.Id = f.MasterPlanId
      INNER JOIN Users creator ON mp.UserId = creator.Id
      LEFT JOIN MasterPlanPermissions perm ON mp.Id = perm.MasterPlanId AND perm.UserId = @userId
      WHERE 
        perm.UserId IS NOT NULL
        OR
        creator.Department = @userDept
      ORDER BY mp.Id DESC
    `);

    const plans = {};
    for (const row of result.recordset) {
      if (!plans[row.Id]) {
        plans[row.Id] = {
          id: row.Id,
          project: row.Project,
          projectType: row.ProjectType,
          startDate: row.StartDate,
          endDate: row.EndDate,
          createdAt: row.CreatedAt,
          createdBy: row.UserId,
          approvalStatus: row.ApprovalStatus || 'Pending Approval',
          fields: {},
        };
      }
      if (row.FieldName) {
        plans[row.Id].fields[row.FieldName] = {
          id: row.FieldId,
          status: row.FieldValue,
          startDate: row.FieldStartDate,
          endDate: row.FieldEndDate
        };
      }
    }

    console.log(`✅ Returned ${Object.keys(plans).length} plans for user ${currentUserId} (${currentUserDepartment})`);
    res.status(200).json(Object.values(plans));
  } catch (err) {
    console.error("Get Master Plans Error:", err);
    res.status(500).json({ message: "Failed to fetch master plans" });
  }
};

// ===================== GET SINGLE PLAN =====================
exports.getMasterPlanById = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    // Get plan details
    const planRequest = pool.request();
    planRequest.input("Id", sql.Int, id);

    const planResult = await planRequest.query(`
      SELECT Id, Project, ProjectType, StartDate, EndDate, CreatedAt, UserId, ApprovalStatus
      FROM MasterPlan 
      WHERE Id = @Id
    `);

    if (planResult.recordset.length === 0) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const plan = planResult.recordset[0];

    // Get fields/milestones
    const fieldsRequest = pool.request();
    fieldsRequest.input("MasterPlanId", sql.Int, id);

    const fieldsResult = await fieldsRequest.query(`
      SELECT FieldName, FieldValue, StartDate, EndDate
      FROM MasterPlanFields
      WHERE MasterPlanId = @MasterPlanId
    `);

    const fields = {};
    for (const row of fieldsResult.recordset) {
      fields[row.FieldName] = {
        status: row.FieldValue,
        startDate: row.StartDate ? new Date(row.StartDate).toISOString().split('T')[0] : null,
        endDate: row.EndDate ? new Date(row.EndDate).toISOString().split('T')[0] : null
      };
    }

    res.status(200).json({
      id: plan.Id,
      project: plan.Project,
      projectType: plan.ProjectType,
      startDate: new Date(plan.StartDate).toISOString().split('T')[0],
      endDate: new Date(plan.EndDate).toISOString().split('T')[0],
      createdAt: plan.CreatedAt,
      createdBy: plan.UserId,
      approvalStatus: plan.ApprovalStatus,
      fields: fields
    });

  } catch (err) {
    console.error("Get Master Plan By ID Error:", err);
    res.status(500).json({ message: "Failed to fetch plan" });
  }
};

// ===================== GET USER PERMISSION =====================
exports.getUserPermission = async (req, res) => {
  const planId = req.params.id;
  const userId = req.user.id;

  try {
    const pool = await getPool();

    // 1️⃣ Check if user is the owner
    const ownerCheckReq = pool.request();
    ownerCheckReq.input("planId", sql.Int, planId);

    const ownerCheck = await ownerCheckReq.query(`
  SELECT UserId 
  FROM MasterPlan 
  WHERE Id = @planId
`);

    // 2️⃣ Check MasterPlanPermissions table
    const permReq = pool.request();
    permReq.input("planId", sql.Int, planId);
    permReq.input("userId", sql.Int, userId);

    const perm = await permReq.query(`
  SELECT PermissionLevel
  FROM MasterPlanPermissions
  WHERE MasterPlanId = @planId AND UserId = @userId
`);

    if (perm.recordset.length > 0) {
      return res.json({ permission: perm.recordset[0].PermissionLevel });
    }

    // 3️⃣ Default fallback
    return res.json({ permission: "viewer" });

  } catch (err) {
    console.error("Permission error:", err);
    return res.json({ permission: "viewer" });
  }
};

// ===================== GET PLAN TEAM =====================
exports.getPlanTeam = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    const teamRequest = pool.request();
    teamRequest.input("planId", sql.Int, id);

    const result = await teamRequest.query(`
      SELECT 
        p.UserId as userId,
        p.PermissionLevel as permission,
        u.FirstName as firstName,
        u.LastName as lastName,
        u.Email as email,
        u.Department as department,
        p.GrantedAt as grantedAt
      FROM MasterPlanPermissions p
      INNER JOIN Users u ON p.UserId = u.Id
      WHERE p.MasterPlanId = @planId
      ORDER BY 
        CASE p.PermissionLevel
          WHEN 'owner' THEN 1
          WHEN 'editor' THEN 2
          WHEN 'viewer' THEN 3
        END,
        u.FirstName, u.LastName
    `);

    res.status(200).json({
      team: result.recordset
    });

  } catch (err) {
    console.error("Get Plan Team Error:", err);
    res.status(500).json({ message: "Failed to fetch team" });
  }
};

// ===================== ADD TEAM MEMBER =====================
exports.addTeamMember = async (req, res) => {
  const { id } = req.params;
  const { userId, permissionLevel } = req.body;
  const grantedBy = req.user.id;

  if (!userId || !permissionLevel) {
    return res.status(400).json({ error: "Missing userId or permissionLevel" });
  }

  if (!['owner', 'editor', 'viewer'].includes(permissionLevel)) {
    return res.status(400).json({ error: "Invalid permission level. Must be 'owner', 'editor' or 'viewer'" });
  }

  try {
    const pool = await getPool();

    // Check if requester is owner
    const ownerCheck = pool.request();
    ownerCheck.input("planId", sql.Int, id);
    ownerCheck.input("userId", sql.Int, grantedBy);

    const ownerResult = await ownerCheck.query(`
      SELECT PermissionLevel FROM MasterPlanPermissions
      WHERE MasterPlanId = @planId AND UserId = @userId
    `);

    if (ownerResult.recordset.length === 0 || ownerResult.recordset[0].PermissionLevel !== 'owner') {
      return res.status(403).json({ error: "Only plan owners can add team members" });
    }

    // Check if user already has permission
    const existingCheck = pool.request();
    existingCheck.input("planId", sql.Int, id);
    existingCheck.input("targetUserId", sql.Int, userId);

    const existing = await existingCheck.query(`
      SELECT Id FROM MasterPlanPermissions
      WHERE MasterPlanId = @planId AND UserId = @targetUserId
    `);

    if (existing.recordset.length > 0) {
      return res.status(409).json({ error: "User already has access to this plan" });
    }

    // Add permission
    const addPerm = pool.request();
    addPerm.input("planId", sql.Int, id);
    addPerm.input("userId", sql.Int, userId);
    addPerm.input("permissionLevel", sql.NVarChar, permissionLevel);
    addPerm.input("grantedBy", sql.Int, grantedBy);

    await addPerm.query(`
      INSERT INTO MasterPlanPermissions (MasterPlanId, UserId, PermissionLevel, GrantedBy)
      VALUES (@planId, @userId, @permissionLevel, @grantedBy)
    `);

    console.log(`✅ Added ${permissionLevel} permission for user ${userId} to plan ${id}`);

    res.status(200).json({
      success: true,
      message: "Team member added successfully"
    });

  } catch (err) {
    console.error("Add Team Member Error:", err);
    res.status(500).json({ error: "Failed to add team member", details: err.message });
  }
};

// ===================== ASSIGN USERS TO MILESTONE =====================
exports.assignMilestoneUsers = async (req, res) => {
  const { id, milestoneId } = req.params;
  const { userIds } = req.body; // Array of user IDs
  const assignedBy = req.user.id;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: "userIds must be a non-empty array" });
  }

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Verify milestone exists
    const milestoneCheck = new sql.Request(transaction);
    milestoneCheck.input("milestoneId", sql.Int, milestoneId);
    milestoneCheck.input("planId", sql.Int, id);

    const milestoneResult = await milestoneCheck.query(`
      SELECT Id FROM MasterPlanFields
      WHERE Id = @milestoneId AND MasterPlanId = @planId
    `);

    if (milestoneResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: "Milestone not found" });
    }

    // Insert users (ignore duplicates)
    for (const userId of userIds) {
      const assignRequest = new sql.Request(transaction);
      assignRequest.input("milestoneId", sql.Int, milestoneId);
      assignRequest.input("userId", sql.Int, userId);
      assignRequest.input("assignedBy", sql.Int, assignedBy);

      await assignRequest.query(`
        IF NOT EXISTS (
          SELECT 1 FROM MasterPlanMilestoneUsers
          WHERE MasterPlanFieldId = @milestoneId AND UserId = @userId
        )
        BEGIN
          INSERT INTO MasterPlanMilestoneUsers (MasterPlanFieldId, UserId, AssignedBy)
          VALUES (@milestoneId, @userId, @assignedBy)
        END
      `);
    }

    await transaction.commit();
    console.log(`✅ Assigned ${userIds.length} users to milestone ${milestoneId}`);

    res.status(200).json({
      success: true,
      message: "Users assigned successfully"
    });

  } catch (err) {
    console.error("Assign Milestone Users Error:", err);
    res.status(500).json({ error: "Failed to assign users", details: err.message });
  }
};

// ===================== GET MILESTONE USERS =====================
exports.getMilestoneUsers = async (req, res) => {
  const { id, milestoneId } = req.params;

  try {
    const pool = await getPool();

    const request = pool.request();
    request.input("milestoneId", sql.Int, milestoneId);
    request.input("planId", sql.Int, id);

    const result = await request.query(`
      SELECT 
        u.Id as userId,
        u.FirstName as firstName,
        u.LastName as lastName,
        u.Email as email,
        u.Department as department,
        mmu.AssignedAt as assignedAt
      FROM MasterPlanMilestoneUsers mmu
      INNER JOIN Users u ON mmu.UserId = u.Id
      INNER JOIN MasterPlanFields mpf ON mmu.MasterPlanFieldId = mpf.Id
      WHERE mmu.MasterPlanFieldId = @milestoneId 
        AND mpf.MasterPlanId = @planId
      ORDER BY u.FirstName, u.LastName
    `);

    res.status(200).json({
      users: result.recordset
    });

  } catch (err) {
    console.error("Get Milestone Users Error:", err);
    res.status(500).json({ error: "Failed to fetch users", details: err.message });
  }
};

// ===================== REMOVE USER FROM MILESTONE =====================
exports.removeMilestoneUser = async (req, res) => {
  const { id, milestoneId, userId } = req.params;

  try {
    const pool = await getPool();

    const request = pool.request();
    request.input("milestoneId", sql.Int, milestoneId);
    request.input("userId", sql.Int, userId);
    request.input("planId", sql.Int, id);

    // Verify milestone belongs to plan
    const verifyResult = await request.query(`
      SELECT mpf.Id FROM MasterPlanFields mpf
      WHERE mpf.Id = @milestoneId AND mpf.MasterPlanId = @planId
    `);

    if (verifyResult.recordset.length === 0) {
      return res.status(404).json({ error: "Milestone not found in this plan" });
    }

    // Remove user
    const deleteRequest = pool.request();
    deleteRequest.input("milestoneId", sql.Int, milestoneId);
    deleteRequest.input("userId", sql.Int, userId);

    const result = await deleteRequest.query(`
      DELETE FROM MasterPlanMilestoneUsers
      WHERE MasterPlanFieldId = @milestoneId AND UserId = @userId
    `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "User assignment not found" });
    }

    console.log(`✅ Removed user ${userId} from milestone ${milestoneId}`);

    res.status(200).json({
      success: true,
      message: "User removed successfully"
    });

  } catch (err) {
    console.error("Remove Milestone User Error:", err);
    res.status(500).json({ error: "Failed to remove user", details: err.message });
  }
};

// ===================== GET ALL MILESTONE ASSIGNMENTS FOR A PLAN =====================
exports.getPlanMilestoneAssignments = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    const request = pool.request();
    request.input("planId", sql.Int, id);

    const result = await request.query(`
      SELECT 
        mpf.Id as milestoneId,
        mpf.FieldName as milestoneName,
        u.Id as userId,
        u.FirstName as firstName,
        u.LastName as lastName,
        u.Email as email,
        mmu.AssignedAt as assignedAt
      FROM MasterPlanFields mpf
      LEFT JOIN MasterPlanMilestoneUsers mmu ON mpf.Id = mmu.MasterPlanFieldId
      LEFT JOIN Users u ON mmu.UserId = u.Id
      WHERE mpf.MasterPlanId = @planId
      ORDER BY mpf.FieldName, u.FirstName, u.LastName
    `);

    // Group by milestone
    const assignments = {};
    for (const row of result.recordset) {
      if (!assignments[row.milestoneId]) {
        assignments[row.milestoneId] = {
          milestoneId: row.milestoneId,
          milestoneName: row.milestoneName,
          users: []
        };
      }

      if (row.userId) {
        assignments[row.milestoneId].users.push({
          userId: row.userId,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          assignedAt: row.assignedAt
        });
      }
    }

    res.status(200).json({
      assignments: Object.values(assignments)
    });

  } catch (err) {
    console.error("Get Plan Milestone Assignments Error:", err);
    res.status(500).json({ error: "Failed to fetch assignments", details: err.message });
  }
};

// ===================== UPDATE TEAM MEMBER PERMISSION =====================
exports.updateTeamMember = async (req, res) => {
  const { id } = req.params;
  const { userId, permissionLevel } = req.body;
  const requesterId = req.user.id;

  if (!userId || !permissionLevel) {
    return res.status(400).json({ error: "Missing userId or permissionLevel" });
  }

  if (!['owner', 'editor', 'viewer'].includes(permissionLevel)) {
    return res.status(400).json({ error: "Invalid permission level. Must be 'owner', 'editor' or 'viewer'" });
  }

  try {
    const pool = await getPool();

    // Check if requester is owner
    const ownerCheck = pool.request();
    ownerCheck.input("planId", sql.Int, id);
    ownerCheck.input("userId", sql.Int, requesterId);

    const ownerResult = await ownerCheck.query(`
      SELECT PermissionLevel FROM MasterPlanPermissions
      WHERE MasterPlanId = @planId AND UserId = @userId
    `);

    if (ownerResult.recordset.length === 0 || ownerResult.recordset[0].PermissionLevel !== 'owner') {
      return res.status(403).json({ error: "Only plan owners can update permissions" });
    }

    // Update permission
    const updatePerm = pool.request();
    updatePerm.input("planId", sql.Int, id);
    updatePerm.input("userId", sql.Int, userId);
    updatePerm.input("permissionLevel", sql.NVarChar, permissionLevel);

    const result = await updatePerm.query(`
      UPDATE MasterPlanPermissions
      SET PermissionLevel = @permissionLevel
      WHERE MasterPlanId = @planId AND UserId = @userId
    `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "User permission not found" });
    }

    console.log(`✅ Updated permission for user ${userId} to ${permissionLevel} on plan ${id}`);

    res.status(200).json({
      success: true,
      message: "Permission updated successfully"
    });

  } catch (err) {
    console.error("Update Team Member Error:", err);
    res.status(500).json({ error: "Failed to update permission", details: err.message });
  }
};

// ===================== REMOVE TEAM MEMBER =====================
exports.removeTeamMember = async (req, res) => {
  const { id, userId } = req.params;
  const requesterId = req.user.id;

  try {
    const pool = await getPool();

    // Check if requester is owner
    const ownerCheck = pool.request();
    ownerCheck.input("planId", sql.Int, id);
    ownerCheck.input("userId", sql.Int, requesterId);

    const ownerResult = await ownerCheck.query(`
      SELECT PermissionLevel FROM MasterPlanPermissions
      WHERE MasterPlanId = @planId AND UserId = @userId
    `);

    if (ownerResult.recordset.length === 0 || ownerResult.recordset[0].PermissionLevel !== 'owner') {
      return res.status(403).json({ error: "Only plan owners can remove team members" });
    }

    // Check if removing the last owner
    const ownerCountCheck = pool.request();
    ownerCountCheck.input("planId", sql.Int, id);

    const ownerCountResult = await ownerCountCheck.query(`
      SELECT COUNT(*) as OwnerCount
      FROM MasterPlanPermissions
      WHERE MasterPlanId = @planId AND PermissionLevel = 'owner'
    `);

    const targetCheck = pool.request();
    targetCheck.input("planId", sql.Int, id);
    targetCheck.input("targetUserId", sql.Int, userId);

    const targetResult = await targetCheck.query(`
      SELECT PermissionLevel FROM MasterPlanPermissions
      WHERE MasterPlanId = @planId AND UserId = @targetUserId
    `);

    if (targetResult.recordset.length > 0 &&
      targetResult.recordset[0].PermissionLevel === 'owner' &&
      ownerCountResult.recordset[0].OwnerCount === 1) {
      return res.status(403).json({ error: "Cannot remove the last owner. Assign another owner first." });
    }

    // Remove permission
    const removePerm = pool.request();
    removePerm.input("planId", sql.Int, id);
    removePerm.input("userId", sql.Int, userId);

    const result = await removePerm.query(`
      DELETE FROM MasterPlanPermissions
      WHERE MasterPlanId = @planId AND UserId = @userId
    `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "User permission not found" });
    }

    console.log(`✅ Removed user ${userId} from plan ${id}`);

    res.status(200).json({
      success: true,
      message: "Team member removed successfully"
    });

  } catch (err) {
    console.error("Remove Team Member Error:", err);
    res.status(500).json({ error: "Failed to remove team member", details: err.message });
  }
};

// ===================== UPDATE (WITH PENDING CHANGES) =====================
exports.updateMasterPlan = async (req, res) => {
  const { id } = req.params;
  const { project, projectType, startDate, endDate, fields, justifications } = req.body;
  const userId = req.user.id;

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log(`📝 Submitting changes for Master Plan ID: ${id} for approval`);

    // 🆕 Create pending changes object
    // 🔑 Reuse existing batchKey if pending changes already exist
    let batchKey;

    const existingReq = new sql.Request(transaction);
    existingReq.input("Id", sql.Int, id);

    const existingResult = await existingReq.query(`
  SELECT PendingChanges
  FROM MasterPlan
  WHERE Id = @Id
`);

    if (existingResult.recordset[0]?.PendingChanges) {
      try {
        const existing = JSON.parse(existingResult.recordset[0].PendingChanges);
        batchKey = existing.batchKey;
      } catch {
        batchKey = null;
      }
    }

    // 🆕 Create new batch if none exists
    if (!batchKey) {
      batchKey = `BATCH_${Date.now()}`;
    }

    const pendingChanges = {
      batchKey,
      project,
      projectType,
      startDate,
      endDate,
      fields,
      justifications,
      submittedAt: new Date().toISOString()
    };

    // 🆕 Store pending changes + update status (DO NOT update actual data)
    const updateRequest = new sql.Request(transaction);
    updateRequest.input("Id", sql.Int, id);
    updateRequest.input("PendingChanges", sql.NVarChar, JSON.stringify(pendingChanges));
    updateRequest.input("PendingChangesBy", sql.Int, userId);
    updateRequest.input("ApprovalStatus", sql.NVarChar, 'Pending Approval');

    await updateRequest.query(`
      UPDATE MasterPlan
SET PendingChanges = @PendingChanges,
    PendingChangesBy = @PendingChangesBy,
    ApprovalStatus = 
      CASE 
        WHEN ApprovalStatus = 'Pending Approval' THEN ApprovalStatus
        ELSE 'Pending Approval'
      END
WHERE Id = @Id
    `);

    await transaction.commit();
    console.log(`✅ Changes stored as pending for approval (Plan ID: ${id})`);

    try {
      const planRequest = pool.request();
      planRequest.input("Id", sql.Int, id);
      const planResult = await planRequest.query(`SELECT Project FROM MasterPlan WHERE Id = @Id`);
      const projectName = planResult.recordset[0]?.Project || 'Unknown Project';

      console.log('📧 Attempting to send approval email...');
      console.log('   Plan ID:', id);
      console.log('   Project Name:', projectName);
      console.log('   Submitted By:', req.user.firstName, req.user.lastName);
      console.log('   Email:', req.user.email);

      await sendApprovalRequestEmail({
        planId: id,
        projectName: projectName,
        submittedBy: req.user.firstName && req.user.lastName
          ? `${req.user.firstName} ${req.user.lastName}`
          : req.user.email,
        submittedByEmail: req.user.email,
        changeType: 'edit'
      });
      
      console.log('✅ Approval email sent successfully');
    } catch (emailError) {
      console.error('❌ FULL EMAIL ERROR:', emailError);
      console.error('   Error message:', emailError.message);
      console.error('   Error stack:', emailError.stack);
    }

    res.status(200).json({
      message: "Changes submitted for approval!",
      approvalStatus: "Pending Approval"
    });

  } catch (err) {
    console.error("❌ Update Master Plan Error:", err);
    res.status(500).json({ message: "Failed to submit changes for approval", error: err.message });
  }
};

// ===================== DELETE =====================
exports.deleteMasterPlan = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    const deleteFields = new sql.Request(transaction);
    deleteFields.input("MasterPlanId", sql.Int, id);
    await deleteFields.query(`
      DELETE FROM MasterPlanFields WHERE MasterPlanId = @MasterPlanId
    `);

    const deletePlan = new sql.Request(transaction);
    deletePlan.input("Id", sql.Int, id);
    await deletePlan.query(`DELETE FROM MasterPlan WHERE Id = @Id`);

    await transaction.commit();
    res.status(200).json({ message: "Master Plan deleted successfully!" });
  } catch (err) {
    console.error("Delete Master Plan Error:", err);
    res.status(500).json({ message: "Failed to delete master plan" });
  }
};

// ===================== SEND MILESTONE DEADLINE EMAIL =====================
exports.sendMilestoneDeadlineEmail = async (req, res) => {
  const { planId, projectName, milestones, dueDate, userEmail, userName } = req.body;

  try {

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const incompleteMilestones = milestones
      .filter(m => !m.status?.toLowerCase().includes('complete'))
      .map(m => `<li><strong>${m.name}</strong>: ${m.status}</li>`)
      .join('');

    const targetMilestone = milestones.find(
      m => !m.status?.toLowerCase().includes('complete')
    );

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'maxcap@ihrp.sg',
      to: userEmail,
      subject: `⚠️ Milestone Deadline Today: ${projectName}`,
      html: `
        <div style="font-family: Montserrat, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">🚨 Milestone Deadline Reminder</h2>
          <p>Hi <strong>${userName}</strong>,</p>
          <p>Your project "<strong>${projectName}</strong>" has a milestone due today 
             (<strong>${new Date(dueDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })}</strong>).</p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #991b1b;">Incomplete Milestones:</h3>
            <ul style="margin: 0;">
              ${incompleteMilestones}
            </ul>
          </div>
          
          <p>Please update the status of these milestones in the system as soon as possible.</p>
          
          <a href="${process.env.APP_URL || 'http://localhost:3000'}/adminviewplan?planId=${planId}&milestone=${encodeURIComponent(targetMilestone?.name)}" 
             style="display: inline-block; background-color: #3b82f6; color: white; 
                    padding: 12px 24px; text-decoration: none; border-radius: 8px; 
                    margin-top: 16px; font-weight: 600;">
            Update Plan Status
          </a>
          
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated reminder from your Project Management System.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    await logNotification({
      recipientEmail: userEmail,
      subject: `Milestone Deadline Today: ${projectName}`,
      content: `One or more milestones for "${projectName}" are due today.`,
      relatedEntity: `MasterPlan:${planId}`,
      status: "delivered",
      source: "milestone_deadline"
    });

    console.log(`✅ Email sent successfully to ${userEmail} for plan ${projectName}`);
    res.status(200).json({
      success: true,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('Error sending milestone deadline email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      details: error.message
    });
  }
};

// ===================== GET PLAN HISTORY =====================
exports.getPlanHistory = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    const historyRequest = pool.request();
    historyRequest.input("planId", sql.Int, id);

    const result = await historyRequest.query(`
      SELECT 
        h.Id,
        h.MilestoneName,
        h.ChangeType,
        h.OldValue,
        h.NewValue,
        h.ChangedAt,
        h.Justification,
        u.FirstName + ' ' + u.LastName as ChangedBy
      FROM MasterPlanHistory h
      INNER JOIN Users u ON h.ChangedBy = u.Id
      WHERE h.MasterPlanId = @planId
      ORDER BY h.ChangedAt DESC
    `);

    res.status(200).json({
      history: result.recordset
    });

  } catch (err) {
    console.error("Get Plan History Error:", err);
    res.status(500).json({ message: "Failed to fetch history" });
  }
};

// ===================== UPDATE MILESTONE STATUS (IMMEDIATE - NO APPROVAL) =====================
exports.updateMilestoneStatus = async (req, res) => {
  const { id } = req.params;
  const { milestoneName, newStatus, justification } = req.body;
  const userId = req.user.id;

  if (!milestoneName || !newStatus) {
    return res.status(400).json({ message: "Missing milestone name or status" });
  }

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log(`🔄 Updating status for milestone "${milestoneName}" to "${newStatus}" (no approval required)`);

    // Get current milestone status
    const oldStatusRequest = new sql.Request(transaction);
    oldStatusRequest.input("MasterPlanId", sql.Int, id);
    oldStatusRequest.input("FieldName", sql.NVarChar, milestoneName);

    const oldStatusResult = await oldStatusRequest.query(`
      SELECT FieldValue FROM MasterPlanFields
      WHERE MasterPlanId = @MasterPlanId AND FieldName = @FieldName
    `);

    if (oldStatusResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: "Milestone not found" });
    }

    const oldStatus = oldStatusResult.recordset[0].FieldValue;

    // Update the status immediately
    const updateRequest = new sql.Request(transaction);
    updateRequest.input("MasterPlanId", sql.Int, id);
    updateRequest.input("FieldName", sql.NVarChar, milestoneName);
    updateRequest.input("NewStatus", sql.NVarChar, newStatus);

    await updateRequest.query(`
      UPDATE MasterPlanFields
      SET FieldValue = @NewStatus
      WHERE MasterPlanId = @MasterPlanId AND FieldName = @FieldName
    `);

    // Log to history
    const historyRequest = new sql.Request(transaction);
    historyRequest.input("MasterPlanId", sql.Int, id);
    historyRequest.input("MilestoneName", sql.NVarChar, milestoneName);
    historyRequest.input("ChangeType", sql.NVarChar, 'status_changed');
    historyRequest.input("OldValue", sql.NVarChar, oldStatus);
    historyRequest.input("NewValue", sql.NVarChar, newStatus);
    historyRequest.input("Justification", sql.NVarChar, justification || null);
    historyRequest.input("ChangedBy", sql.Int, userId);

    await historyRequest.query(`
      INSERT INTO MasterPlanHistory 
        (MasterPlanId, MilestoneName, ChangeType, OldValue, NewValue, Justification, ChangedBy)
      VALUES 
        (@MasterPlanId, @MilestoneName, @ChangeType, @OldValue, @NewValue, @Justification, @ChangedBy)
    `);

    await transaction.commit();
    console.log(`✅ Status updated successfully: ${oldStatus} → ${newStatus}`);

    res.status(200).json({
      message: "Status updated successfully!",
      milestoneName,
      oldStatus,
      newStatus
    });

  } catch (err) {
    console.error("❌ Update Milestone Status Error:", err);
    res.status(500).json({ message: "Failed to update status", error: err.message });
  }
};

// ===================== EMAIL UTILITY FUNCTIONS =====================

exports.sendPlanApprovedEmail = async ({ planId, projectName, approvedBy, creatorEmail, creatorName }) => {
  console.log('📧 DEBUG - Email Config:');
  console.log('  SMTP_HOST:', process.env.SMTP_HOST);
  console.log('  SMTP_PORT:', process.env.SMTP_PORT);
  console.log('  EMAIL_USER:', process.env.EMAIL_USER);
  console.log('  EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('  EMAIL_PASSWORD exists:', !!process.env.EMAIL_PASSWORD);
  console.log('  Recipients:', ['muhammad.hasan@ihrp.sg', 'jumana.haseen@ihrp.sg'].join(','));

  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const approvers = ['muhammad.hasan@ihrp.sg', 'jumana.haseen@ihrp.sg'];
  const changeText = changeType === 'new'
    ? 'A new master plan has been created'
    : 'Changes have been submitted to an existing master plan';

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'maxcap@ihrp.sg',
    to: approvers.join(','),
    subject: `🔔 Approval Required: ${projectName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        
        <!-- Main Container -->
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc;">
          <tr>
            <td style="padding: 40px 20px;">
              
              <!-- Email Card -->
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0;">
                
                <!-- Header -->
                <tr>
                  <td style="background-color: #3b82f6; padding: 32px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      📋 MaxCap
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; font-weight: 500;">
                      Project Management System
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px; background-color: #ffffff;">
                    
                    <!-- Title -->
                    <h2 style="margin: 0 0 8px 0; color: #1e293b; font-size: 24px; font-weight: 700;">
                      Approval Request
                    </h2>
                    <p style="margin: 0 0 32px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                      ${changeText} and requires your approval.
                    </p>
                    
                    <!-- Info Card -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #eff6ff; border-radius: 12px; border: 2px solid #93c5fd; margin-bottom: 32px;">
                      <tr>
                        <td style="padding: 24px;">
                          
                          <!-- Project Name -->
                          <p style="margin: 0 0 4px 0; color: #475569; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            Project Name
                          </p>
                          <p style="margin: 0 0 20px 0; color: #1e293b; font-size: 18px; font-weight: 700;">
                            ${projectName}
                          </p>
                          
                          <!-- Submitted By -->
                          <p style="margin: 0 0 4px 0; color: #475569; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            Submitted By
                          </p>
                          <p style="margin: 0 0 4px 0; color: #1e293b; font-size: 15px; font-weight: 600;">
                            ${submittedBy}
                          </p>
                          <p style="margin: 0 0 20px 0; color: #64748b; font-size: 13px;">
                            ${submittedByEmail}
                          </p>
                          
                          <!-- Status -->
                          <p style="margin: 0 0 8px 0; color: #475569; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            Status
                          </p>
                          <div style="display: inline-block; background-color: #fef3c7; border: 2px solid #fbbf24; border-radius: 8px; padding: 8px 16px;">
                            <span style="color: #92400e; font-size: 13px; font-weight: 700; letter-spacing: 0.3px;">
                              ⏳ PENDING APPROVAL
                            </span>
                          </div>
                          
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Action Required -->
                    <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                      Please review this plan and approve or reject it at your earliest convenience.
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="text-align: center; padding: 0;">
                          <a href="${process.env.APP_URL || 'http://localhost:3000'}/adminapprovals" 
                             style="display: inline-block; background-color: #3b82f6; 
                                    color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; 
                                    font-weight: 700; font-size: 15px; letter-spacing: 0.3px;">
                            Review Plan →
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6; text-align: center;">
                      This is an automated notification from <strong>MaxCap</strong> Project Management System.<br>
                      © ${new Date().getFullYear()} IHRP. All rights reserved.
                    </p>
                  </td>
                </tr>
                
              </table>
              
            </td>
          </tr>
        </table>
        
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);

  for (const approver of approvers) {
    await logNotification({
      recipientEmail: approver,
      subject: `Approval Required: ${projectName}`,
      content: `A master plan requires approval.\nSubmitted by: ${submittedBy}`,
      relatedEntity: `MasterPlan:${planId}`,
      status: "delivered",
      source: "approval_request"
    });
  }

  console.log(`✅ Approval request email sent for ${projectName}`);
};

exports.sendPlanApprovedEmail = async ({ planId, projectName, approvedBy, creatorEmail, creatorName }) => {
  console.log('📧 DEBUG - Email Config:');
  console.log('  SMTP_HOST:', process.env.SMTP_HOST);
  console.log('  SMTP_PORT:', process.env.SMTP_PORT);
  console.log('  EMAIL_USER:', process.env.EMAIL_USER);
  console.log('  EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('  EMAIL_PASSWORD exists:', !!process.env.EMAIL_PASSWORD);
  console.log('  creatorEmail is:', typeof creatorEmail, creatorEmail);

  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'maxcap@ihrp.sg',
    to: creatorEmail,
    subject: `✅ Plan Approved: ${projectName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc;">
          <tr>
            <td style="padding: 40px 20px;">
              
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0;">
                
                <!-- Header -->
                <tr>
                  <td style="background-color: #10b981; padding: 32px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      ✅ MaxCap
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; font-weight: 500;">
                      Project Management System
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px; background-color: #ffffff;">
                    
                    <h2 style="margin: 0 0 8px 0; color: #1e293b; font-size: 24px; font-weight: 700;">
                      Plan Approved! 🎉
                    </h2>
                    <p style="margin: 0 0 32px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                      Hi <strong style="color: #1e293b;">${creatorName}</strong>, great news! Your master plan has been approved.
                    </p>
                    
                    <!-- Success Card -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #d1fae5; border-radius: 12px; border: 2px solid #6ee7b7; margin-bottom: 32px;">
                      <tr>
                        <td style="padding: 24px;">
                          
                          <p style="margin: 0 0 4px 0; color: #065f46; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            Project Name
                          </p>
                          <p style="margin: 0 0 20px 0; color: #047857; font-size: 18px; font-weight: 700;">
                            ${projectName}
                          </p>
                          
                          <p style="margin: 0 0 4px 0; color: #065f46; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            Approved By
                          </p>
                          <p style="margin: 0 0 20px 0; color: #047857; font-size: 15px; font-weight: 600;">
                            ${approvedBy}
                          </p>
                          
                          <p style="margin: 0 0 8px 0; color: #065f46; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            Status
                          </p>
                          <div style="display: inline-block; background-color: #a7f3d0; border: 2px solid #10b981; border-radius: 8px; padding: 8px 16px;">
                            <span style="color: #065f46; font-size: 13px; font-weight: 700; letter-spacing: 0.3px;">
                              ✓ APPROVED
                            </span>
                          </div>
                          
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                      Your changes are now live and visible to all team members. You can view and manage your plan anytime.
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="text-align: center; padding: 0;">
                          <a href="${process.env.APP_URL || 'http://localhost:3000'}/adminviewplan?planId=${planId}" 
                             style="display: inline-block; background-color: #10b981; 
                                    color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; 
                                    font-weight: 700; font-size: 15px; letter-spacing: 0.3px;">
                            View Plan →
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6; text-align: center;">
                      This is an automated notification from <strong>MaxCap</strong> Project Management System.<br>
                      © ${new Date().getFullYear()} IHRP. All rights reserved.
                    </p>
                  </td>
                </tr>
                
              </table>
              
            </td>
          </tr>
        </table>
        
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);

  await logNotification({
    recipientEmail: creatorEmail,
    subject: `Plan Approved: ${projectName}`,
    content: `Your plan has been approved by ${approvedBy}.`,
    relatedEntity: `MasterPlan:${planId}`,
    status: "delivered",
    source: "approval_result"
  });

  console.log(`✅ Approval confirmation email sent to ${creatorEmail}`);
};

// Add this to the milestone deadline email function (around line 730)
exports.sendMilestoneDeadlineEmail = async (req, res) => {
  const { planId, projectName, milestones, dueDate, userEmail, userName } = req.body;

  try {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const incompleteMilestones = milestones
      .filter(m => !m.status?.toLowerCase().includes('complete'))
      .map(m => `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #fecaca; background-color: #fef2f2;">
            <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">
              ${m.name}
            </p>
            <p style="margin: 4px 0 0 0; color: #b91c1c; font-size: 12px;">
              Status: ${m.status}
            </p>
          </td>
        </tr>
      `)
      .join('');

    const targetMilestone = milestones.find(
      m => !m.status?.toLowerCase().includes('complete')
    );

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'maxcap@ihrp.sg',
      to: userEmail,
      subject: `⚠️ Milestone Deadline Today: ${projectName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="light dark">
          <meta name="supported-color-schemes" content="light dark">
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc;">
            <tr>
              <td style="padding: 40px 20px;">
                
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #ef4444; padding: 32px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                        ⚠️ MaxCap
                      </h1>
                      <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; font-weight: 500;">
                        Project Management System
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px; background-color: #ffffff;">
                      
                      <h2 style="margin: 0 0 8px 0; color: #1e293b; font-size: 24px; font-weight: 700;">
                        Milestone Deadline Today! 🚨
                      </h2>
                      <p style="margin: 0 0 32px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                        Hi <strong style="color: #1e293b;">${userName}</strong>, you have a milestone due today.
                      </p>
                      
                      <!-- Alert Card -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fee2e2; border-radius: 12px; border: 2px solid #fca5a5; margin-bottom: 24px;">
                        <tr>
                          <td style="padding: 24px;">
                            <p style="margin: 0 0 4px 0; color: #7f1d1d; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                              Project
                            </p>
                            <p style="margin: 0 0 16px 0; color: #991b1b; font-size: 18px; font-weight: 700;">
                              ${projectName}
                            </p>
                            
                            <p style="margin: 0 0 4px 0; color: #7f1d1d; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                              Due Date
                            </p>
                            <p style="margin: 0; color: #991b1b; font-size: 15px; font-weight: 600;">
                              ${new Date(dueDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })}
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Incomplete Milestones -->
                      <p style="margin: 0 0 12px 0; color: #475569; font-size: 14px; font-weight: 600;">
                        Incomplete Milestones:
                      </p>
                      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; border: 2px solid #fee2e2; margin-bottom: 24px; overflow: hidden;">
                        ${incompleteMilestones}
                      </table>
                      
                      <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                        Please update the status of these milestones in the system as soon as possible.
                      </p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%;">
                        <tr>
                          <td style="text-align: center; padding: 0;">
                            <a href="${process.env.APP_URL || 'http://localhost:3000'}/adminviewplan?planId=${planId}&milestone=${encodeURIComponent(targetMilestone?.name)}" 
                               style="display: inline-block; background-color: #ef4444; 
                                      color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; 
                                      font-weight: 700; font-size: 15px; letter-spacing: 0.3px;">
                              Update Status →
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6; text-align: center;">
                        This is an automated reminder from <strong>MaxCap</strong> Project Management System.<br>
                        © ${new Date().getFullYear()} IHRP. All rights reserved.
                      </p>
                    </td>
                  </tr>
                  
                </table>
                
              </td>
            </tr>
          </table>
          
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);

    await logNotification({
      recipientEmail: userEmail,
      subject: `Milestone Deadline Today: ${projectName}`,
      content: `One or more milestones for "${projectName}" are due today.`,
      relatedEntity: `MasterPlan:${planId}`,
      status: "delivered",
      source: "milestone_deadline"
    });

    console.log(`✅ Email sent successfully to ${userEmail} for plan ${projectName}`);
    res.status(200).json({
      success: true,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('Error sending milestone deadline email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      details: error.message
    });
  }
};

exports.sendApprovalRequest = async (req, res) => {
  try {
    await sendApprovalRequestEmail(req.body);
    res.status(200).json({ success: true, message: 'Approval request email sent successfully' });
  } catch (error) {
    console.error('Error sending approval request email:', error);
    res.status(500).json({ success: false, error: 'Failed to send email', details: error.message });
  }
};

exports.sendPlanApproved = async (req, res) => {
  try {
    await sendPlanApprovedEmail(req.body);
    res.status(200).json({ success: true, message: 'Approval confirmation email sent successfully' });
  } catch (error) {
    console.error('Error sending approval confirmation email:', error);
    res.status(500).json({ success: false, error: 'Failed to send email', details: error.message });
  }
};

// ===================== SEND ONE WEEK WARNING EMAIL =====================
exports.sendMilestoneWeekWarning = async (req, res) => {
  const { planId, projectName, milestoneName, dueDate, userEmail, userName } = req.body;

  try {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'maxcap@ihrp.sg',
      to: userEmail,
      subject: `⏰ Milestone Due in 1 Week: ${projectName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="light dark">
          <meta name="supported-color-schemes" content="light dark">
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc;">
            <tr>
              <td style="padding: 40px 20px;">
                
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #f59e0b; padding: 32px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                        ⏰ MaxCap
                      </h1>
                      <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; font-weight: 500;">
                        Project Management System
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px; background-color: #ffffff;">
                      
                      <h2 style="margin: 0 0 8px 0; color: #1e293b; font-size: 24px; font-weight: 700;">
                        Milestone Approaching
                      </h2>
                      <p style="margin: 0 0 32px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                        Hi <strong style="color: #1e293b;">${userName}</strong>, you have a milestone due in <strong>7 days</strong>.
                      </p>
                      
                      <!-- Warning Card -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef3c7; border-radius: 12px; border: 2px solid #fbbf24; margin-bottom: 32px;">
                        <tr>
                          <td style="padding: 24px;">
                            
                            <p style="margin: 0 0 4px 0; color: #78350f; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                              Project
                            </p>
                            <p style="margin: 0 0 20px 0; color: #92400e; font-size: 18px; font-weight: 700;">
                              ${projectName}
                            </p>
                            
                            <p style="margin: 0 0 4px 0; color: #78350f; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                              Milestone
                            </p>
                            <p style="margin: 0 0 20px 0; color: #92400e; font-size: 15px; font-weight: 600;">
                              ${milestoneName}
                            </p>
                            
                            <p style="margin: 0 0 4px 0; color: #78350f; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                              Due Date
                            </p>
                            <p style="margin: 0; color: #92400e; font-size: 15px; font-weight: 600;">
                              ${new Date(dueDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })}
                            </p>
                            
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                        Please ensure all tasks are on track to meet this deadline.
                      </p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%;">
                        <tr>
                          <td style="text-align: center; padding: 0;">
                            <a href="${process.env.APP_URL || 'http://localhost:3000'}/adminviewplan?planId=${planId}&milestone=${encodeURIComponent(milestoneName)}" 
                               style="display: inline-block; background-color: #f59e0b; 
                                      color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; 
                                      font-weight: 700; font-size: 15px; letter-spacing: 0.3px;">
                              View Plan →
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6; text-align: center;">
                        This is an automated reminder from <strong>MaxCap</strong> Project Management System.<br>
                        © ${new Date().getFullYear()} IHRP. All rights reserved.
                      </p>
                    </td>
                  </tr>
                  
                </table>
                
              </td>
            </tr>
          </table>
          
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);

    await logNotification({
      recipientEmail: userEmail,
      subject: `Milestone Due in 1 Week: ${projectName}`,
      content: `Milestone "${milestoneName}" for "${projectName}" is due in one week.`,
      relatedEntity: `MasterPlan:${planId}`,
      status: "delivered",
      source: "milestone_week_warning"
    });

    console.log(`✅ One week warning email sent to ${userEmail} for ${milestoneName}`);
    res.status(200).json({
      success: true,
      message: 'Warning email sent successfully'
    });

  } catch (error) {
    console.error('Error sending week warning email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      details: error.message
    });
  }
};