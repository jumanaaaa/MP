const { sql, config } = require("../db");

// ===================== CREATE =====================
exports.createIndividualPlan = async (req, res) => {
  const { project, role, startDate, endDate, fields } = req.body; // 🔥 REMOVE supervisorId from body
  const userId = req.user.id;

  if (!project || !startDate || !endDate) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    await sql.connect(config);
    
    // 🆕 FETCH USER'S SUPERVISOR FROM THEIR AssignedUnder FIELD
    const getUserRequest = new sql.Request();
    getUserRequest.input("UserId", sql.Int, userId);
    
    const userResult = await getUserRequest.query(`
      SELECT AssignedUnder FROM Users WHERE Id = @UserId
    `);
    
    const supervisorId = userResult.recordset[0]?.AssignedUnder || null;
    
    console.log(`✅ Creating plan for User ${userId}, Supervisor: ${supervisorId || 'None'}`);
    
    // NOW CREATE THE PLAN WITH AUTO-LINKED SUPERVISOR
    const request = new sql.Request();
    const fieldsJson = JSON.stringify(fields || {});

    request.input("Project", sql.NVarChar, project);
    request.input("Role", sql.NVarChar, role || null);
    request.input("StartDate", sql.Date, startDate);
    request.input("EndDate", sql.Date, endDate);
    request.input("Fields", sql.NVarChar(sql.MAX), fieldsJson);
    request.input("UserId", sql.Int, userId);
    request.input("SupervisorId", sql.Int, supervisorId); // 🆕 AUTO-LINKED FROM USERS TABLE

    await request.query(`
      INSERT INTO IndividualPlan
        (Project, Role, StartDate, EndDate, Fields, UserId, SupervisorId)
      VALUES
        (@Project, @Role, @StartDate, @EndDate, @Fields, @UserId, @SupervisorId)
    `);

    res.status(201).json({ 
      message: "Individual Plan created successfully",
      supervisorNotified: supervisorId ? true : false // 🆕 OPTIONAL: Indicate if supervisor was linked
    });
  } catch (err) {
    console.error("Create Individual Plan Error:", err);
    res.status(500).json({ message: "Failed to create individual plan" });
  }
};

// ===================== READ =====================
exports.getIndividualPlans = async (req, res) => {
  const userId = req.user.id;

  try {
    await sql.connect(config);
    const request = new sql.Request();
    request.input("UserId", sql.Int, userId);

    const result = await request.query(`
      SELECT 
        ip.Id,
        ip.Project,
        ip.Role,
        ip.StartDate,
        ip.EndDate,
        ip.Fields,
        ip.CreatedAt,
        ip.UserId AS OwnerUserId,
        u.FirstName AS OwnerFirstName,
        u.LastName AS OwnerLastName
      FROM IndividualPlan ip
      INNER JOIN Users u ON ip.UserId = u.Id
      WHERE ip.UserId = @UserId
      ORDER BY ip.CreatedAt DESC
    `);

    const plans = result.recordset.map((plan) => ({
      ...plan,
      Fields: JSON.parse(plan.Fields || "{}"),
    }));

    res.status(200).json(plans);
  } catch (err) {
    console.error("Get Individual Plans Error:", err);
    res.status(500).json({ message: "Failed to fetch individual plans" });
  }
};

// ===================== UPDATE =====================
exports.updateIndividualPlan = async (req, res) => {
  const { id } = req.params;
  const { project, role, startDate, endDate, fields } = req.body;
  const userId = req.user.id; // ← Get userId from JWT token

  try {
    await sql.connect(config);
    
    // First, check if the plan exists and belongs to the current user
    const checkRequest = new sql.Request();
    checkRequest.input("Id", sql.Int, id);
    checkRequest.input("UserId", sql.Int, userId);
    
    const checkResult = await checkRequest.query(`
      SELECT Id FROM IndividualPlan 
      WHERE Id = @Id AND UserId = @UserId
    `);
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ 
        message: "Plan not found or you don't have permission to edit it" 
      });
    }
    
    // If ownership verified, proceed with update
    const request = new sql.Request();
    const fieldsJson = JSON.stringify(fields || {});

    request.input("Id", sql.Int, id);
    request.input("Project", sql.NVarChar, project);
    request.input("Role", sql.NVarChar, role || null);
    request.input("StartDate", sql.Date, startDate);
    request.input("EndDate", sql.Date, endDate);
    request.input("Fields", sql.NVarChar(sql.MAX), fieldsJson);
    request.input("UserId", sql.Int, userId); // ← Add userId

    await request.query(`
      UPDATE IndividualPlan
      SET Project = @Project,
          Role = @Role,
          StartDate = @StartDate,
          EndDate = @EndDate,
          Fields = @Fields
      WHERE Id = @Id AND UserId = @UserId  -- ← Verify ownership
    `);

    res.status(200).json({ message: "Individual Plan updated successfully" });
  } catch (err) {
    console.error("Update Individual Plan Error:", err);
    res.status(500).json({ message: "Failed to update individual plan" });
  }
};

// ===================== UPDATE MILESTONE STATUS =====================
exports.updateMilestoneStatus = async (req, res) => {
  const { id } = req.params; // Plan ID
  const { milestoneName, status } = req.body;
  const userId = req.user.id;

  if (!milestoneName || !status) {
    return res.status(400).json({ message: "Missing milestone name or status" });
  }

  // Validate status
  if (!['Ongoing', 'Completed'].includes(status)) {
    return res.status(400).json({ message: "Invalid status. Must be 'Ongoing' or 'Completed'" });
  }

  try {
    await sql.connect(config);
    
    // First, get the current plan and verify ownership
    const checkRequest = new sql.Request();
    checkRequest.input("Id", sql.Int, id);
    checkRequest.input("UserId", sql.Int, userId);
    
    const checkResult = await checkRequest.query(`
      SELECT Id, Fields FROM IndividualPlan 
      WHERE Id = @Id AND UserId = @UserId
    `);
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ 
        message: "Plan not found or you don't have permission to edit it" 
      });
    }

    // Parse current fields
    const currentFields = JSON.parse(checkResult.recordset[0].Fields || '{}');
    
    // Check if milestone exists
    if (!currentFields[milestoneName]) {
      return res.status(404).json({ 
        message: `Milestone '${milestoneName}' not found in this plan` 
      });
    }

    // Update milestone status
    currentFields[milestoneName].status = status;

    // Save back to database
    const updateRequest = new sql.Request();
    updateRequest.input("Id", sql.Int, id);
    updateRequest.input("UserId", sql.Int, userId);
    updateRequest.input("Fields", sql.NVarChar(sql.MAX), JSON.stringify(currentFields));

    await updateRequest.query(`
      UPDATE IndividualPlan
      SET Fields = @Fields
      WHERE Id = @Id AND UserId = @UserId
    `);

    res.status(200).json({ 
      message: "Milestone status updated successfully",
      milestone: milestoneName,
      newStatus: status
    });
  } catch (err) {
    console.error("Update Milestone Status Error:", err);
    res.status(500).json({ message: "Failed to update milestone status" });
  }
};



// ===================== DELETE (NOT EXPOSED IN ROUTES) =====================
// Keeping this here but commented out since you don't want delete functionality
exports.deleteIndividualPlan = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    await sql.connect(config);
    const request = new sql.Request();
    request.input("Id", sql.Int, id);
    request.input("UserId", sql.Int, userId);

    // Only allow deletion if user owns the plan
    const result = await request.query(`
      DELETE FROM IndividualPlan 
      WHERE Id = @Id AND UserId = @UserId
    `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ 
        message: "Plan not found or you don't have permission to delete it" 
      });
    }

    res.status(200).json({ message: "Individual Plan deleted successfully" });
  } catch (err) {
    console.error("Delete Individual Plan Error:", err);
    res.status(500).json({ message: "Failed to delete individual plan" });
  }
};

// ===================== READ (SUPERVISED) =====================
exports.getSupervisedIndividualPlans = async (req, res) => {
  const supervisorId = req.user.id;

  try {
    await sql.connect(config);

    const request = new sql.Request();
    request.input("SupervisorId", sql.Int, supervisorId);

    const result = await request.query(`
  SELECT 
    ip.Id AS id,
    ip.Project AS project,
    ip.StartDate AS startDate,
    ip.EndDate AS endDate,
    'In Progress' AS status,
    ip.Fields AS fields,
    u.FirstName + ' ' + u.LastName AS ownerName
  FROM IndividualPlan ip
  INNER JOIN Users u ON ip.UserId = u.Id
  WHERE ip.SupervisorId = @SupervisorId
  ORDER BY ip.CreatedAt DESC
`);

    res.status(200).json(
      result.recordset.map(p => ({
        ...p,
        fields: JSON.parse(p.fields || '{}')
      }))
    );
  } catch (err) {
    console.error("Get Supervised Plans Error:", err);
    res.status(500).json({ message: "Failed to fetch supervised plans" });
  }
};

// ===================== EMAIL UTILITY FUNCTIONS =====================

const nodemailer = require('nodemailer');

const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      ciphers: 'SSLv3'
    }
  });
};

const sendMilestoneReminderEmail = async ({ userName, userEmail, milestoneName, planProject, daysUntilDue, endDate, planId }) => {
  console.log('📧 DEBUG - Email Config:');
  console.log('  SMTP_HOST:', process.env.SMTP_HOST);
  console.log('  SMTP_PORT:', process.env.SMTP_PORT);
  console.log('  EMAIL_USER:', process.env.EMAIL_USER);
  console.log('  EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('  Recipient:', userEmail);

  const transporter = createEmailTransporter();
  
  const isToday = daysUntilDue === 0;
  const subject = isToday 
    ? `⏰ Milestone Due Today: ${milestoneName}`
    : `📅 Milestone Due in 7 Days: ${milestoneName}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'maxcap@ihrp.sg',
    to: userEmail,
    subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Montserrat', sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
      padding: 32px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .content {
      padding: 32px;
    }
    .greeting {
      font-size: 16px;
      color: #1e293b;
      margin-bottom: 16px;
      font-weight: 600;
    }
    .message {
      font-size: 14px;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .milestone-card {
      background-color: #f1f5f9;
      border-left: 4px solid ${isToday ? '#ef4444' : '#f59e0b'};
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .milestone-name {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }
    .milestone-detail {
      font-size: 14px;
      color: #64748b;
      margin: 4px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #3b82f6;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      margin-top: 16px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${isToday ? '⏰ Milestone Due Today!' : '📅 Milestone Reminder'}</h1>
    </div>
    <div class="content">
      <div class="greeting">Hi ${userName},</div>
      <div class="message">
        ${isToday 
          ? `Your milestone is due <strong>today</strong>! Please update its status.`
          : `This is a reminder that your milestone is due in <strong>7 days</strong>.`
        }
      </div>
      <div class="milestone-card">
        <div class="milestone-name">${milestoneName}</div>
        <div class="milestone-detail"><strong>Project:</strong> ${planProject}</div>
        <div class="milestone-detail"><strong>Due Date:</strong> ${new Date(endDate).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</div>
      </div>
      <a href="${process.env.APP_URL || 'http://localhost:5173'}/adminindividualplan" class="cta-button">
        Update Status Now
      </a>
    </div>
    <div class="footer">
      <p>This is an automated reminder from IHRP MaxCap Plan Management System</p>
      <p>© ${new Date().getFullYear()} IHRP. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ ${isToday ? 'DUE TODAY' : '7-DAY'} reminder sent to ${userEmail} for: ${milestoneName}`);
};

// ===================== MILESTONE REMINDER CHECKER (CRON MODE) =====================
const checkMilestoneReminders = async () => {
  try {
    console.log('🔍 [MILESTONE REMINDER] Checking for due milestones...');
    await sql.connect(config);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(today.getDate() + 7);

    const result = await sql.query(`
      SELECT 
        ip.Id,
        ip.Project,
        ip.Fields,
        u.Id as UserId,
        u.FirstName,
        u.LastName,
        u.Email
      FROM IndividualPlan ip
      INNER JOIN Users u ON ip.UserId = u.Id
    `);

    let remindersCount = 0;

    for (const plan of result.recordset) {
      const fields = JSON.parse(plan.Fields || '{}');
      
      for (const [milestoneName, milestoneData] of Object.entries(fields)) {
        if (milestoneName === 'title' || milestoneName === 'status') continue;
        if (!milestoneData || typeof milestoneData !== 'object') continue;
        if (milestoneData.status === 'Completed') continue;
        if (!milestoneData.endDate) continue;

        const endDate = new Date(milestoneData.endDate);
        endDate.setHours(0, 0, 0, 0);

        const isDueToday = endDate.getTime() === today.getTime();
        const isDueInSevenDays = endDate.getTime() === oneWeekFromNow.getTime();

        if (isDueToday || isDueInSevenDays) {
          const daysUntilDue = isDueToday ? 0 : 7;
          
          try {
            await sendMilestoneReminderEmail({
              userName: plan.FirstName,
              userEmail: plan.Email,
              milestoneName,
              planProject: plan.Project,
              daysUntilDue,
              endDate: milestoneData.endDate,
              planId: plan.Id
            });
            remindersCount++;
          } catch (emailError) {
            console.error(`❌ Failed to send email to ${plan.Email}:`, emailError.message);
          }
        }
      }
    }

    console.log(`✅ [MILESTONE REMINDER] Check completed. Sent ${remindersCount} reminder(s)`);
  } catch (error) {
    console.error('❌ [MILESTONE REMINDER] Error:', error);
  }
};

// ===================== ROUTE HANDLERS (FOR MANUAL TRIGGERS) =====================

// Manual trigger for milestone reminder check
exports.triggerMilestoneReminders = async (req, res) => {
  try {
    await checkMilestoneReminders();
    res.status(200).json({
      success: true,
      message: 'Milestone reminder check completed successfully'
    });
  } catch (error) {
    console.error('Error triggering milestone reminders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send milestone reminders',
      details: error.message
    });
  }
};

// Send individual milestone reminder (manual)
exports.sendMilestoneReminder = async (req, res) => {
  try {
    await sendMilestoneReminderEmail(req.body);
    res.status(200).json({
      success: true,
      message: 'Milestone reminder email sent successfully'
    });
  } catch (error) {
    console.error('Error sending milestone reminder email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      details: error.message
    });
  }
};

// Export for cron job
module.exports.checkMilestoneReminders = checkMilestoneReminders;