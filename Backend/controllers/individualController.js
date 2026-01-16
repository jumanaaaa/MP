const { sql, getPool } = require("../db/pool");
const nodemailer = require('nodemailer');
const { logNotification } = require("../utils/notificationLogger");

// ===================== CREATE =====================
exports.createIndividualPlan = async (req, res) => {
  const { project, projectType, role, startDate, endDate, fields } = req.body;
  const userId = req.user.id;

  if (!project || !startDate || !endDate) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const pool = await getPool();
    
    // 🆕 FETCH USER'S SUPERVISOR FROM THEIR AssignedUnder FIELD
    const getUserRequest = pool.request();
    getUserRequest.input("UserId", sql.Int, userId);
    
    const userResult = await getUserRequest.query(`
      SELECT AssignedUnder FROM Users WHERE Id = @UserId
    `);
    
    const supervisorId = userResult.recordset[0]?.AssignedUnder || null;
    
    console.log(`✅ Creating plan for User ${userId}, Supervisor: ${supervisorId || 'None'}`);
    
    // NOW CREATE THE PLAN WITH AUTO-LINKED SUPERVISOR
    const request = pool.request();
    const fieldsJson = JSON.stringify(fields || {});

    request.input("Project", sql.NVarChar, project);
    request.input("ProjectType", sql.NVarChar, projectType || 'custom');
    request.input("Role", sql.NVarChar, role || null);
    request.input("StartDate", sql.Date, startDate);
    request.input("EndDate", sql.Date, endDate);
    request.input("Fields", sql.NVarChar(sql.MAX), fieldsJson);
    request.input("UserId", sql.Int, userId);
    request.input("SupervisorId", sql.Int, supervisorId); // 🆕 AUTO-LINKED FROM USERS TABLE

    await request.query(`
  INSERT INTO IndividualPlan
    (Project, ProjectType, Role, StartDate, EndDate, Fields, UserId, SupervisorId)
  VALUES
    (@Project, @ProjectType, @Role, @StartDate, @EndDate, @Fields, @UserId, @SupervisorId)
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
  const { project, type } = req.query; // 🆕 Accept query params

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input("UserId", sql.Int, userId);

    let query = `
      SELECT 
        ip.Id,
        ip.Project,
        ip.ProjectType,
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
    `;

    // 🆕 Add optional filters
    if (project) {
      request.input("Project", sql.NVarChar, project);
      query += ` AND ip.Project = @Project`;
    }

    if (type) {
      request.input("ProjectType", sql.NVarChar, type);
      query += ` AND ip.ProjectType = @ProjectType`;
    }

    query += ` ORDER BY ip.CreatedAt DESC`;

    const result = await request.query(query);

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
  const { project, projectType, role, startDate, endDate, fields } = req.body;
  const userId = req.user.id; // ← Get userId from JWT token

  try {
    const pool = await getPool();
    
    // First, check if the plan exists and belongs to the current user
    const checkRequest = pool.request();
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
    const request = pool.request();
    const fieldsJson = JSON.stringify(fields || {});

    request.input("Id", sql.Int, id);
    request.input("Project", sql.NVarChar, project);
    request.input("ProjectType", sql.NVarChar, projectType || 'custom');
    request.input("Role", sql.NVarChar, role || null);
    request.input("StartDate", sql.Date, startDate);
    request.input("EndDate", sql.Date, endDate);
    request.input("Fields", sql.NVarChar(sql.MAX), fieldsJson);
    request.input("UserId", sql.Int, userId); // ← Add userId

    await request.query(`
      UPDATE IndividualPlan
      SET Project = @Project,
          ProjectType = @ProjectType,
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
    const pool = await getPool();
    
    // First, get the current plan and verify ownership
    const checkRequest = pool.request();
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
    const updateRequest = pool.request();
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
    const pool = await getPool();
    const request = pool.request();
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
    const pool = await getPool();

    const request = pool.request();
    request.input("SupervisorId", sql.Int, supervisorId);

    const result = await request.query(`
  SELECT 
    ip.Id AS id,
    ip.Project AS project,
    ip.ProjectType AS projectType,
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
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
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
                  <td style="background-color: ${isToday ? '#ef4444' : '#f59e0b'}; padding: 32px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      ${isToday ? '⏰ MaxCap' : '📅 MaxCap'}
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
                      ${isToday ? 'Milestone Due Today! 🚨' : 'Milestone Approaching'}
                    </h2>
                    <p style="margin: 0 0 32px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                      Hi <strong style="color: #1e293b;">${userName}</strong>, ${isToday 
                        ? 'your milestone is due <strong>today</strong>. Please update its status as soon as possible.'
                        : 'you have a milestone due in <strong>7 days</strong>. Please ensure you\'re on track.'
                      }
                    </p>
                    
                    <!-- Milestone Card -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: ${isToday ? '#fee2e2' : '#fef3c7'}; border-radius: 12px; border: 2px solid ${isToday ? '#fca5a5' : '#fbbf24'}; margin-bottom: 32px;">
                      <tr>
                        <td style="padding: 24px;">
                          
                          <!-- Milestone Name -->
                          <p style="margin: 0 0 4px 0; color: ${isToday ? '#7f1d1d' : '#78350f'}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            Milestone
                          </p>
                          <p style="margin: 0 0 20px 0; color: ${isToday ? '#991b1b' : '#92400e'}; font-size: 18px; font-weight: 700;">
                            ${milestoneName}
                          </p>
                          
                          <!-- Project Name -->
                          <p style="margin: 0 0 4px 0; color: ${isToday ? '#7f1d1d' : '#78350f'}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            Project
                          </p>
                          <p style="margin: 0 0 20px 0; color: ${isToday ? '#991b1b' : '#92400e'}; font-size: 15px; font-weight: 600;">
                            ${planProject}
                          </p>
                          
                          <!-- Due Date -->
                          <p style="margin: 0 0 4px 0; color: ${isToday ? '#7f1d1d' : '#78350f'}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            Due Date
                          </p>
                          <p style="margin: 0 0 20px 0; color: ${isToday ? '#991b1b' : '#92400e'}; font-size: 15px; font-weight: 600;">
                            ${new Date(endDate).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                          
                          <!-- Status Badge -->
                          <p style="margin: 0 0 8px 0; color: ${isToday ? '#7f1d1d' : '#78350f'}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            Urgency
                          </p>
                          <div style="display: inline-block; background-color: ${isToday ? '#fef2f2' : '#fffbeb'}; border: 2px solid ${isToday ? '#ef4444' : '#f59e0b'}; border-radius: 8px; padding: 8px 16px;">
                            <span style="color: ${isToday ? '#991b1b' : '#92400e'}; font-size: 13px; font-weight: 700; letter-spacing: 0.3px;">
                              ${isToday ? '🚨 DUE TODAY' : '⏰ DUE IN 7 DAYS'}
                            </span>
                          </div>
                          
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Action Message -->
                    <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                      ${isToday 
                        ? 'Please update the status of this milestone in the system immediately.'
                        : 'Review your progress and ensure all tasks are on track to meet this deadline.'
                      }
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="text-align: center; padding: 0;">
                          <a href="${process.env.APP_URL || 'http://localhost:5173'}/adminindividualplan" 
                             style="display: inline-block; background-color: ${isToday ? '#ef4444' : '#f59e0b'}; 
                                    color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; 
                                    font-weight: 700; font-size: 15px; letter-spacing: 0.3px;">
                            ${isToday ? 'Update Status Now →' : 'View Plan →'}
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
    subject,
    content: `Milestone "${milestoneName}" for project "${planProject}" is due ${daysUntilDue === 0 ? 'today' : 'in 7 days'}.`,
    relatedEntity: `IndividualPlan:${planId}`,
    status: "delivered",
    source: "milestone_reminder"
  });
  
  console.log(`✅ ${isToday ? 'DUE TODAY' : '7-DAY'} reminder sent to ${userEmail} for: ${milestoneName}`);
};

// ===================== MILESTONE REMINDER CHECKER (CRON MODE) =====================
const checkMilestoneReminders = async () => {
  try {
    console.log('🔍 [MILESTONE REMINDER] Checking for due milestones...');
    const pool = await getPool();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(today.getDate() + 7);

    const result = await pool.request().query(`
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