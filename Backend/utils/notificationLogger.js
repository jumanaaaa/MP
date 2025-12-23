const { sql, config } = require("../db");

const logNotification = async ({
  recipientEmail,
  subject,
  content,
  relatedEntity = null,
  status = "delivered",
  source = "nodemailer"
}) => {
  try {
    await sql.connect(config);

    const request = new sql.Request();
    request.input("RecipientEmail", sql.NVarChar, recipientEmail);
    request.input("SenderEmail", sql.NVarChar, "maxcap@ihrp.sg");
    request.input("Subject", sql.NVarChar, subject);
    request.input("Content", sql.NVarChar, content);
    request.input("Status", sql.NVarChar, status);
    request.input("Source", sql.NVarChar, source);
    request.input("RelatedEntity", sql.NVarChar, relatedEntity);

    await request.query(`
      INSERT INTO Notifications
      (RecipientEmail, SenderEmail, Subject, Content, Status, Source, RelatedEntity)
      VALUES
      (@RecipientEmail, @SenderEmail, @Subject, @Content, @Status, @Source, @RelatedEntity)
    `);
  } catch (err) {
    console.error("❌ Notification log failed:", err);
    // DO NOT throw — email should not fail because logging failed
  }
};

module.exports = { logNotification };
