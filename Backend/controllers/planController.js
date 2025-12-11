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

// ===================== READ =====================
exports.getMasterPlans = async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT mp.Id, mp.Project, mp.ProjectType, mp.StartDate, mp.EndDate, mp.CreatedAt, mp.UserId, mp.ApprovalStatus,
             f.FieldName, f.FieldValue, f.StartDate as FieldStartDate, f.EndDate as FieldEndDate
      FROM MasterPlan mp
      LEFT JOIN MasterPlanFields f ON mp.Id = f.MasterPlanId
      ORDER BY mp.Id DESC
    `);

    const plans = {};
    for (const row of result.recordset) {
      if (!plans[row.Id]) {
        plans[row.Id] = {
          id: row.Id,
          project: row.Project,
          projectType: row.ProjectType, // 🆕 NEW
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
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    await sql.connect(config);
    
    const permRequest = new sql.Request();
    permRequest.input("planId", sql.Int, id);
    permRequest.input("userId", sql.Int, userId);
    
    const result = await permRequest.query(`
      SELECT PermissionLevel 
      FROM MasterPlanPermissions
      WHERE MasterPlanId = @planId AND UserId = @userId
    `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "No permission found" });
    }
    
    res.status(200).json({ 
      permission: result.recordset[0].PermissionLevel 
    });
    
  } catch (err) {
    console.error("Get Permission Error:", err);
    res.status(500).json({ message: "Failed to get permission" });
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

// ===================== UPDATE =====================
exports.updateMasterPlan = async (req, res) => {
  const { id } = req.params;
  const { project, projectType, startDate, endDate, fields } = req.body; // 🆕 Added projectType

  try {
    await sql.connect(config);
    const transaction = new sql.Transaction();
    await transaction.begin();

    console.log(`📝 Updating Master Plan ID: ${id}, Type: ${projectType}`);

    // === Update main MasterPlan table ===
    const updateRequest = new sql.Request(transaction);
    updateRequest.input("Id", sql.Int, id);
    updateRequest.input("Project", sql.NVarChar, project);
    updateRequest.input("ProjectType", sql.NVarChar, projectType || 'General'); // 🆕 NEW
    updateRequest.input("StartDate", sql.Date, startDate || null);
    updateRequest.input("EndDate", sql.Date, endDate || null);

    await updateRequest.query(`
      UPDATE MasterPlan
      SET Project = @Project, ProjectType = @ProjectType, StartDate = @StartDate, EndDate = @EndDate
      WHERE Id = @Id
    `);
    console.log(`✅ Updated MasterPlan table for project: ${project} (${projectType})`);

    // === Remove all old fields before inserting new ===
    const deleteFields = new sql.Request(transaction);
    deleteFields.input("MasterPlanId", sql.Int, id);
    await deleteFields.query(`
      DELETE FROM MasterPlanFields WHERE MasterPlanId = @MasterPlanId
    `);
    console.log(`🧹 Cleared old milestone fields for MasterPlan ID: ${id}`);

    // === Insert new milestone fields ===
    if (fields && typeof fields === "object") {
      for (const [fieldName, fieldData] of Object.entries(fields)) {
        const fieldRequest = new sql.Request(transaction);
        fieldRequest.input("MasterPlanId", sql.Int, id);
        fieldRequest.input("FieldName", sql.NVarChar, fieldName);

        // ✅ Safely parse field data
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

        console.log(`   📊 Updated milestone: ${fieldName} (${safeStart} → ${safeEnd}, ${safeStatus})`);
      }
    } else {
      console.log("ℹ️ No milestone fields provided in update request.");
    }

    await transaction.commit();
    console.log(`🎯 Master Plan [${project}] (ID: ${id}, Type: ${projectType}) updated successfully.`);
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