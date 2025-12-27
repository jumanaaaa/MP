const { sql, getPool } = require("../db/pool");const nodemailer = require('nodemailer');
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

    // ✅ CALL EMAIL FUNCTION DIRECTLY (no HTTP fetch)
    try {
      await sendApprovalRequestEmail({
        planId: masterPlanId,
        projectName: project,
        submittedBy: `${req.user.firstName} ${req.user.lastName}`,
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
    const transaction = new sql.Transaction();
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

    // ✅ CALL EMAIL FUNCTION DIRECTLY
    try {
      const planRequest = pool.request();
      planRequest.input("Id", sql.Int, id);
      const planResult = await planRequest.query(`SELECT Project FROM MasterPlan WHERE Id = @Id`);
      const projectName = planResult.recordset[0]?.Project || 'Unknown Project';

      await sendApprovalRequestEmail({
        planId: id,
        projectName: projectName,
        submittedBy: `${req.user.firstName} ${req.user.lastName}`,
        submittedByEmail: req.user.email,
        changeType: 'edit'
      });
    } catch (emailError) {
      console.error('⚠️ Failed to send approval email (non-blocking):', emailError.message);
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
    const transaction = new sql.Transaction();
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

const sendApprovalRequestEmail = async ({ planId, projectName, submittedBy, submittedByEmail, changeType }) => {

  // 🆕 ADD THESE DEBUG LOGS
  console.log('📧 DEBUG - Email Config:');
  console.log('  SMTP_HOST:', process.env.SMTP_HOST);
  console.log('  SMTP_PORT:', process.env.SMTP_PORT);
  console.log('  EMAIL_USER:', process.env.EMAIL_USER);
  console.log('  EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('  EMAIL_PASSWORD exists:', !!process.env.EMAIL_PASSWORD);
  console.log('  Recipients:', ['muhammad.hasan@ihrp.sg', 'jumana.haseen@ihrp.sg'].join(','));

  const transporter = nodemailer.createTransport({
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
      <div style="font-family: Montserrat, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">📋 Master Plan Approval Request</h2>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0;">
          <p><strong>${changeText}</strong></p>
          <p><strong>Project:</strong> ${projectName}</p>
          <p><strong>Submitted by:</strong> ${submittedBy} (${submittedByEmail})</p>
          <p><strong>Status:</strong> Pending Your Approval</p>
        </div>
        
        <p>Please review and approve or reject this plan in the system.</p>
        
        <a href="${process.env.APP_URL || 'http://localhost:3000'}/adminapprovals" 
           style="display: inline-block; background-color: #3b82f6; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 8px; 
                  margin-top: 16px; font-weight: 600;">
          Review Plan
        </a>
        
        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">
        
        <p style="color: #6b7280; font-size: 12px;">
          This is an automated notification from your Project Management System.
        </p>
      </div>
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

const sendPlanApprovedEmail = async ({ planId, projectName, approvedBy, creatorEmail, creatorName }) => {

  // 🆕 ADD THESE DEBUG LOGS
  console.log('📧 DEBUG - Email Config:');
  console.log('  SMTP_HOST:', process.env.SMTP_HOST);
  console.log('  SMTP_PORT:', process.env.SMTP_PORT);
  console.log('  EMAIL_USER:', process.env.EMAIL_USER);
  console.log('  EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('  EMAIL_PASSWORD exists:', !!process.env.EMAIL_PASSWORD);
  console.log('  creatorEmail is:', typeof creatorEmail, creatorEmail);  // ✅ Extra validation

  const transporter = nodemailer.createTransport({  // ✅ createTransport (no "er")
    host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',  // ✅ matches your .env
    port: parseInt(process.env.SMTP_PORT) || 587,            // ✅ parse to int
    secure: false,                                            // ✅ must be false for port 587
    auth: {
      user: process.env.EMAIL_USER,     // muhammad.hasan@ihrp.sg
      pass: process.env.EMAIL_PASSWORD  // IHRP@2025
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'maxcap@ihrp.sg',
    to: creatorEmail,
    subject: `✅ Plan Approved: ${projectName}`,
    html: `
      <div style="font-family: Montserrat, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">✅ Your Plan Has Been Approved!</h2>
        
        <p>Hi <strong>${creatorName}</strong>,</p>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0;">
          <p><strong>Good news!</strong> Your master plan has been approved.</p>
          <p><strong>Project:</strong> ${projectName}</p>
          <p><strong>Approved by:</strong> ${approvedBy}</p>
          <p><strong>Status:</strong> Approved ✓</p>
        </div>
        
        <p>Your changes are now live and visible to all team members.</p>
        
        <a href="${process.env.APP_URL || 'http://localhost:3000'}/adminviewplan?planId=${planId}" 
           style="display: inline-block; background-color: #10b981; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 8px; 
                  margin-top: 16px; font-weight: 600;">
          View Plan
        </a>
        
        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">
        
        <p style="color: #6b7280; font-size: 12px;">
          This is an automated notification from your Project Management System.
        </p>
      </div>
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


// ===================== SEND APPROVAL REQUEST EMAIL =====================
// ===================== ROUTE HANDLERS (KEPT FOR MANUAL TRIGGERS) =====================
exports.sendApprovalRequest = async (req, res) => {
  try {
    await sendApprovalRequestEmail(req.body);
    res.status(200).json({ success: true, message: 'Approval request email sent successfully' });
  } catch (error) {
    console.error('Error sending approval request email:', error);
    res.status(500).json({ success: false, error: 'Failed to send email', details: error.message });
  }
};

// ===================== SEND PLAN APPROVED EMAIL =====================
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
    const transporter = nodemailer.createTransport({
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
        <div style="font-family: Montserrat, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">⏰ Milestone Deadline Approaching</h2>
          
          <p>Hi <strong>${userName}</strong>,</p>
          
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
            <p><strong>Reminder:</strong> You have a milestone due in <strong>7 days</strong>.</p>
            <p><strong>Project:</strong> ${projectName}</p>
            <p><strong>Milestone:</strong> ${milestoneName}</p>
            <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })}</p>
          </div>
          
          <p>Please ensure all tasks are on track to meet this deadline.</p>
          
          <a href="${process.env.APP_URL || 'http://localhost:3000'}/adminviewplan?planId=${planId}&milestone=${encodeURIComponent(milestoneName)}" 
             style="display: inline-block; background-color: #f59e0b; color: white; 
                    padding: 12px 24px; text-decoration: none; border-radius: 8px; 
                    margin-top: 16px; font-weight: 600;">
            View Plan
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

module.exports.sendPlanApprovedEmail = sendPlanApprovedEmail;