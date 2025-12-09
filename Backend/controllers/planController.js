const { sql, config } = require("../db");

// ===================== CREATE =====================
exports.createMasterPlan = async (req, res) => {
  const { project, projectType, startDate, endDate, fields } = req.body; // 🆕 Added projectType

  if (!project || !startDate || !endDate) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    await sql.connect(config);
    const transaction = new sql.Transaction();
    await transaction.begin();

    // Insert into MasterPlan with ProjectType
    const planRequest = new sql.Request(transaction);
    planRequest.input("Project", sql.NVarChar, project);
    planRequest.input("ProjectType", sql.NVarChar, projectType || 'General'); // 🆕 NEW
    planRequest.input("StartDate", sql.Date, startDate);
    planRequest.input("EndDate", sql.Date, endDate);
    planRequest.input("UserId", sql.Int, req.user.id);
    planRequest.input("ApprovalStatus", sql.NVarChar, 'Pending Approval');

    const planResult = await planRequest.query(`
      INSERT INTO MasterPlan (Project, ProjectType, StartDate, EndDate, UserId, ApprovalStatus)
      OUTPUT INSERTED.Id
      VALUES (@Project, @ProjectType, @StartDate, @EndDate, @UserId, @ApprovalStatus)
    `);

    const masterPlanId = planResult.recordset[0].Id;
    console.log(`✅ Created MasterPlan with ID: ${masterPlanId}, Type: ${projectType} (Status: Pending Approval)`);

    // Insert dynamic fields with dates
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

    await transaction.commit();
    console.log(`✅ Master Plan "${project}" (${projectType}) created successfully and submitted for approval!`);
    res.status(201).json({ 
      message: "Master Plan created successfully and submitted for approval!",
      planId: masterPlanId,
      approvalStatus: "Pending Approval"
    });
  } catch (err) {
    console.error("Create Master Plan Error:", err);
    res.status(500).json({ message: "Failed to create master plan" });
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