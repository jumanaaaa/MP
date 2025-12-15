const { sql, config } = require("../db");

// ===================== CREATE =====================
exports.createMasterPlan = async (req, res) => {
  const { project, projectType, startDate, endDate, fields, permissions } = req.body;
  const creatorId = req.user.id;

  if (!project || !startDate || !endDate) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    await sql.connect(config);
    const transaction = new sql.Transaction();
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

    // STEP 3: 🆕 INSERT PERMISSIONS
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
    
    res.status(201).json({ 
      message: "Master Plan created successfully and submitted for approval!",
      planId: masterPlanId,
      approvalStatus: "Pending Approval"
    });

  } catch (err) {
    console.error("Create Master Plan Error:", err);
    res.status(500).json({ 
      message: "Failed to create master plan",
      error: err.message 
    });
  }
};

// ===================== READ (WITH DEPARTMENT FILTERING) =====================
exports.getMasterPlans = async (req, res) => {
  const currentUserId = req.user.id;
  const currentUserDepartment = req.user.department;

  try {
    await sql.connect(config);
    
    // 🆕 ENHANCED QUERY WITH DEPARTMENT + PERMISSION FILTERING
    const request = new sql.Request();
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
        f.FieldName, 
        f.FieldValue, 
        f.StartDate as FieldStartDate, 
        f.EndDate as FieldEndDate
      FROM MasterPlan mp
      LEFT JOIN MasterPlanFields f ON mp.Id = f.MasterPlanId
      -- 🔑 Join to get plan creator's department
      INNER JOIN Users creator ON mp.UserId = creator.Id
      -- 🔑 Left join to check explicit permissions
      LEFT JOIN MasterPlanPermissions perm ON mp.Id = perm.MasterPlanId AND perm.UserId = @userId
      WHERE 
        -- Show plan if user has explicit permission
        perm.UserId IS NOT NULL
        OR
        -- Show plan if user is in same department as creator
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
    await sql.connect(config);
    
    // Get plan details
    const planRequest = new sql.Request();
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
    const fieldsRequest = new sql.Request();
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
        // 🆕 CONVERT TO yyyy-MM-dd FORMAT
        startDate: row.StartDate ? new Date(row.StartDate).toISOString().split('T')[0] : null,
        endDate: row.EndDate ? new Date(row.EndDate).toISOString().split('T')[0] : null
      };
    }
    
    res.status(200).json({
      id: plan.Id,
      project: plan.Project,
      projectType: plan.ProjectType,
      // 🆕 CONVERT TO yyyy-MM-dd FORMAT
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
    await sql.connect(config);

    // 1️⃣ Check if user is the owner
    const ownerCheck = await sql.query(`
      SELECT UserId 
      FROM MasterPlan 
      WHERE Id = ${planId}
    `);

    if (ownerCheck.recordset.length > 0 && ownerCheck.recordset[0].UserId === userId) {
      return res.json({ permission: "owner" });
    }

    // 2️⃣ Check MasterPlanPermissions table
    const perm = await sql.query(`
      SELECT PermissionLevel
      FROM MasterPlanPermissions
      WHERE MasterPlanId = ${planId} AND UserId = ${userId}
    `);

    if (perm.recordset.length > 0) {
      return res.json({ permission: perm.recordset[0].PermissionLevel });
    }

    // 3️⃣ Default fallback
    return res.json({ permission: "viewer" });

  } catch (err) {
    console.error("Permission error:", err);
    return res.json({ permission: "viewer" }); // Always safe fallback
  }
};

// ===================== GET PLAN TEAM =====================
exports.getPlanTeam = async (req, res) => {
  const { id } = req.params;
  
  try {
    await sql.connect(config);
    
    const teamRequest = new sql.Request();
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

  if (!['editor', 'viewer'].includes(permissionLevel)) {
    return res.status(400).json({ error: "Invalid permission level. Must be 'editor' or 'viewer'" });
  }

  try {
    await sql.connect(config);
    
    // Check if requester is owner
    const ownerCheck = new sql.Request();
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
    const existingCheck = new sql.Request();
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
    const addPerm = new sql.Request();
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

// ===================== UPDATE TEAM MEMBER PERMISSION =====================
exports.updateTeamMember = async (req, res) => {
  const { id } = req.params;
  const { userId, permissionLevel } = req.body;
  const requesterId = req.user.id;
  
  if (!userId || !permissionLevel) {
    return res.status(400).json({ error: "Missing userId or permissionLevel" });
  }

  if (!['editor', 'viewer'].includes(permissionLevel)) {
    return res.status(400).json({ error: "Invalid permission level. Must be 'editor' or 'viewer'" });
  }

  try {
    await sql.connect(config);
    
    // Check if requester is owner
    const ownerCheck = new sql.Request();
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
    const updatePerm = new sql.Request();
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
    await sql.connect(config);
    
    // Check if requester is owner
    const ownerCheck = new sql.Request();
    ownerCheck.input("planId", sql.Int, id);
    ownerCheck.input("userId", sql.Int, requesterId);
    
    const ownerResult = await ownerCheck.query(`
      SELECT PermissionLevel FROM MasterPlanPermissions
      WHERE MasterPlanId = @planId AND UserId = @userId
    `);
    
    if (ownerResult.recordset.length === 0 || ownerResult.recordset[0].PermissionLevel !== 'owner') {
      return res.status(403).json({ error: "Only plan owners can remove team members" });
    }

    // Prevent removing owner
    const targetCheck = new sql.Request();
    targetCheck.input("planId", sql.Int, id);
    targetCheck.input("targetUserId", sql.Int, userId);
    
    const targetResult = await targetCheck.query(`
      SELECT PermissionLevel FROM MasterPlanPermissions
      WHERE MasterPlanId = @planId AND UserId = @targetUserId
    `);

    if (targetResult.recordset.length > 0 && targetResult.recordset[0].PermissionLevel === 'owner') {
      return res.status(403).json({ error: "Cannot remove plan owner" });
    }

    // Remove permission
    const removePerm = new sql.Request();
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

// ===================== UPDATE =====================
// ===================== UPDATE =====================
exports.updateMasterPlan = async (req, res) => {
  const { id } = req.params;
  const { project, projectType, startDate, endDate, fields, justifications } = req.body;
  const userId = req.user.id;

  try {
    await sql.connect(config);
    const transaction = new sql.Transaction();
    await transaction.begin();

    console.log(`📝 Updating Master Plan ID: ${id}, Type: ${projectType}`);

    // 🆕 STEP 1: Fetch OLD project data before update (for project-level history)
    const oldPlanRequest = new sql.Request(transaction);
    oldPlanRequest.input("Id", sql.Int, id);
    
    const oldPlanResult = await oldPlanRequest.query(`
      SELECT Project, StartDate, EndDate
      FROM MasterPlan
      WHERE Id = @Id
    `);
    
    const oldPlan = oldPlanResult.recordset[0];
    console.log('📜 Old project data captured:', oldPlan);

    // 🆕 STEP 2: Fetch OLD fields before deletion (for milestone-level history)
    const oldFieldsRequest = new sql.Request(transaction);
    oldFieldsRequest.input("MasterPlanId", sql.Int, id);
    
    const oldFieldsResult = await oldFieldsRequest.query(`
      SELECT FieldName, FieldValue, StartDate, EndDate
      FROM MasterPlanFields
      WHERE MasterPlanId = @MasterPlanId
    `);
    
    const oldFields = {};
    oldFieldsResult.recordset.forEach(row => {
      oldFields[row.FieldName] = {
        status: row.FieldValue,
        startDate: row.StartDate,
        endDate: row.EndDate
      };
    });

    console.log('📜 Old fields captured for history:', Object.keys(oldFields));

    // === Update main MasterPlan table ===
    const updateRequest = new sql.Request(transaction);
    updateRequest.input("Id", sql.Int, id);
    updateRequest.input("Project", sql.NVarChar, project);
    updateRequest.input("ProjectType", sql.NVarChar, projectType || 'General');
    updateRequest.input("StartDate", sql.Date, startDate || null);
    updateRequest.input("EndDate", sql.Date, endDate || null);
    updateRequest.input("ApprovalStatus", sql.NVarChar, 'Pending Approval'); // 🆕 ADD THIS

    await updateRequest.query(`
  UPDATE MasterPlan
  SET Project = @Project, 
      ProjectType = @ProjectType, 
      StartDate = @StartDate, 
      EndDate = @EndDate, 
      ApprovalStatus = @ApprovalStatus  -- 🆕 ADD THIS
  WHERE Id = @Id
`);
    console.log(`✅ Updated MasterPlan table for project: ${project} (${projectType})`);

    // 🆕 LOG PROJECT NAME CHANGE
    if (oldPlan.Project !== project) {
      console.log(`📝 Logging: Project name changed from "${oldPlan.Project}" to "${project}"`);
      const historyRequest = new sql.Request(transaction);
      historyRequest.input("MasterPlanId", sql.Int, id);
      historyRequest.input("MilestoneName", sql.NVarChar, 'Project Name');
      historyRequest.input("ChangeType", sql.NVarChar, 'project_renamed');
      historyRequest.input("OldValue", sql.NVarChar, oldPlan.Project);
      historyRequest.input("NewValue", sql.NVarChar, project);
      historyRequest.input("ChangedBy", sql.Int, userId);
      
      await historyRequest.query(`
        INSERT INTO MasterPlanHistory (MasterPlanId, MilestoneName, ChangeType, OldValue, NewValue, ChangedBy)
        VALUES (@MasterPlanId, @MilestoneName, @ChangeType, @OldValue, @NewValue, @ChangedBy)
      `);
    }

    // 🆕 LOG PROJECT DATES CHANGE
    const oldStartDate = oldPlan.StartDate ? new Date(oldPlan.StartDate).toISOString().split('T')[0] : null;
    const oldEndDate = oldPlan.EndDate ? new Date(oldPlan.EndDate).toISOString().split('T')[0] : null;
    const newStartDate = startDate || null;
    const newEndDate = endDate || null;

    if (oldStartDate !== newStartDate || oldEndDate !== newEndDate) {
      console.log(`📝 Logging: Project dates changed from (${oldStartDate} - ${oldEndDate}) to (${newStartDate} - ${newEndDate})`);
      const historyRequest = new sql.Request(transaction);
      historyRequest.input("MasterPlanId", sql.Int, id);
      historyRequest.input("MilestoneName", sql.NVarChar, 'Project Timeline');
      historyRequest.input("ChangeType", sql.NVarChar, 'project_dates_changed');
      historyRequest.input("OldValue", sql.NVarChar, `${oldStartDate} to ${oldEndDate}`);
      historyRequest.input("NewValue", sql.NVarChar, `${newStartDate} to ${newEndDate}`);
      historyRequest.input("ChangedBy", sql.Int, userId);
      
      await historyRequest.query(`
        INSERT INTO MasterPlanHistory (MasterPlanId, MilestoneName, ChangeType, OldValue, NewValue, ChangedBy)
        VALUES (@MasterPlanId, @MilestoneName, @ChangeType, @OldValue, @NewValue, @ChangedBy)
      `);
    }

    // === Remove all old fields before inserting new ===
    const deleteFields = new sql.Request(transaction);
    deleteFields.input("MasterPlanId", sql.Int, id);
    await deleteFields.query(`
      DELETE FROM MasterPlanFields WHERE MasterPlanId = @MasterPlanId
    `);
    console.log(`🧹 Cleared old milestone fields for MasterPlan ID: ${id}`);

    // === Insert new milestone fields + LOG CHANGES ===
    if (fields && typeof fields === "object") {
      for (const [fieldName, fieldData] of Object.entries(fields)) {
        const fieldRequest = new sql.Request(transaction);
        fieldRequest.input("MasterPlanId", sql.Int, id);
        fieldRequest.input("FieldName", sql.NVarChar, fieldName);

        const safeStatus = fieldData?.status ? String(fieldData.status) : "";
        const safeStart = fieldData?.startDate || null;
        const safeEnd = fieldData?.endDate || null;

        fieldRequest.input("FieldValue", sql.NVarChar, safeStatus);
        fieldRequest.input("StartDate", sql.Date, safeStart);
        fieldRequest.input("EndDate", sql.Date, safeEnd);

        await fieldRequest.query(`
          INSERT INTO MasterPlanFields (MasterPlanId, FieldName, FieldValue, StartDate, EndDate)
          VALUES (@MasterPlanId, @FieldName, @FieldValue, @StartDate, @EndDate)
        `);

        // 🆕 HISTORY TRACKING FOR MILESTONES
        const oldField = oldFields[fieldName];
        
        if (!oldField) {
          // NEW MILESTONE ADDED
          console.log(`📝 Logging: New milestone "${fieldName}" added`);
          const historyRequest = new sql.Request(transaction);
          historyRequest.input("MasterPlanId", sql.Int, id);
          historyRequest.input("MilestoneName", sql.NVarChar, fieldName);
          historyRequest.input("ChangeType", sql.NVarChar, 'milestone_added');
          historyRequest.input("OldValue", sql.NVarChar, null);
          historyRequest.input("NewValue", sql.NVarChar, `${safeStatus} (${safeStart} - ${safeEnd})`);
          historyRequest.input("ChangedBy", sql.Int, userId);
          
          await historyRequest.query(`
  INSERT INTO MasterPlanHistory 
    (MasterPlanId, MilestoneName, ChangeType, OldValue, NewValue, Justification, ChangedBy)
  VALUES 
    (@MasterPlanId, @MilestoneName, @ChangeType, @OldValue, @NewValue, @Justification, @ChangedBy)
`);
        } else {
          // CHECK FOR CHANGES
          const statusChanged = oldField.status !== safeStatus;
          const datesChanged = 
            (oldField.startDate?.toISOString().split('T')[0] !== safeStart) ||
            (oldField.endDate?.toISOString().split('T')[0] !== safeEnd);

          if (statusChanged) {
            console.log(`📝 Logging: Status change for "${fieldName}": ${oldField.status} → ${safeStatus}`);
            const historyRequest = new sql.Request(transaction);
            historyRequest.input("MasterPlanId", sql.Int, id);
            historyRequest.input("MilestoneName", sql.NVarChar, fieldName);
            historyRequest.input("ChangeType", sql.NVarChar, 'status_changed');
            historyRequest.input("OldValue", sql.NVarChar, oldField.status);
            historyRequest.input("NewValue", sql.NVarChar, safeStatus);
            historyRequest.input("ChangedBy", sql.Int, userId);
            historyRequest.input("Justification", sql.NVarChar, justifications?.[fieldName] || null);
            
            await historyRequest.query(`
  INSERT INTO MasterPlanHistory 
    (MasterPlanId, MilestoneName, ChangeType, OldValue, NewValue, Justification, ChangedBy)
  VALUES 
    (@MasterPlanId, @MilestoneName, @ChangeType, @OldValue, @NewValue, @Justification, @ChangedBy)
`);
          }

          if (datesChanged) {
            console.log(`📝 Logging: Dates changed for "${fieldName}"`);
            const historyRequest = new sql.Request(transaction);
            historyRequest.input("MasterPlanId", sql.Int, id);
            historyRequest.input("MilestoneName", sql.NVarChar, fieldName);
            historyRequest.input("ChangeType", sql.NVarChar, 'dates_changed');
            historyRequest.input("OldValue", sql.NVarChar, 
              `${oldField.startDate?.toISOString().split('T')[0]} - ${oldField.endDate?.toISOString().split('T')[0]}`
            );
            historyRequest.input("NewValue", sql.NVarChar, `${safeStart} - ${safeEnd}`);
            historyRequest.input("ChangedBy", sql.Int, userId);
            historyRequest.input("Justification", sql.NVarChar, justifications?.[fieldName] || null);
            
            await historyRequest.query(`
  INSERT INTO MasterPlanHistory 
    (MasterPlanId, MilestoneName, ChangeType, OldValue, NewValue, Justification, ChangedBy)
  VALUES 
    (@MasterPlanId, @MilestoneName, @ChangeType, @OldValue, @NewValue, @Justification, @ChangedBy)
`);
          }
        }

        console.log(`   📊 Updated milestone: ${fieldName} (${safeStart} → ${safeEnd}, ${safeStatus})`);
      }

      // 🆕 LOG DELETED MILESTONES
      for (const [oldFieldName, oldFieldData] of Object.entries(oldFields)) {
        if (!fields[oldFieldName]) {
          console.log(`📝 Logging: Milestone "${oldFieldName}" deleted`);
          const historyRequest = new sql.Request(transaction);
          historyRequest.input("MasterPlanId", sql.Int, id);
          historyRequest.input("MilestoneName", sql.NVarChar, oldFieldName);
          historyRequest.input("ChangeType", sql.NVarChar, 'milestone_deleted');
          historyRequest.input("OldValue", sql.NVarChar, 
            `${oldFieldData.status} (${oldFieldData.startDate?.toISOString().split('T')[0]} - ${oldFieldData.endDate?.toISOString().split('T')[0]})`
          );
          historyRequest.input("NewValue", sql.NVarChar, null);
          historyRequest.input("ChangedBy", sql.Int, userId);
          historyRequest.input("Justification", sql.NVarChar, justifications?.[oldFieldName] || null);

          await historyRequest.query(`
  INSERT INTO MasterPlanHistory 
    (MasterPlanId, MilestoneName, ChangeType, OldValue, NewValue, Justification, ChangedBy)
  VALUES
    (@MasterPlanId, @MilestoneName, @ChangeType, @OldValue, @NewValue, @Justification, @ChangedBy)
`);
        }
      }
    } else {
      console.log("ℹ️ No milestone fields provided in update request.");
    }

    await transaction.commit();
    console.log(`🎯 Master Plan [${project}] (ID: ${id}, Type: ${projectType}) updated successfully with full history tracked.`);
    res.status(200).json({ message: "Master Plan updated successfully!" });

  } catch (err) {
    console.error("❌ Update Master Plan Error:", err);
    res.status(500).json({
      message: "Failed to update master plan",
      error: err.message
    });
  }
};

// ===================== DELETE =====================
exports.deleteMasterPlan = async (req, res) => {
  const { id } = req.params;

  try {
    await sql.connect(config);
    const transaction = new sql.Transaction();
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
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
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

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
      to: userEmail,
      subject: `⚠️ Milestone Deadline Today: ${projectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
          
          <a href="${process.env.APP_URL || 'http://localhost:3000'}/admineditplan" 
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
    await sql.connect(config);
    
    const historyRequest = new sql.Request();
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