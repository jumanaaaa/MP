const { sql, getPool } = require("../db/pool");
// ===================== CREATE / LOG NOTIFICATION =====================
exports.createNotification = async ({
  recipientEmail,
  subject,
  content,
  relatedEntity = null,
  status = "delivered",
  source = "nodemailer",
  senderEmail = "maxcap@ihrp.sg"
}) => {
  try {
    const pool = await getPool();

    const request = pool.request();
    request.input("RecipientEmail", sql.NVarChar, recipientEmail);
    request.input("SenderEmail", sql.NVarChar, senderEmail);
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
    // IMPORTANT: never throw — logging must never break main flow
    console.error("❌ Create Notification Error:", err);
  }
};

// ===================== GET USER NOTIFICATIONS =====================
exports.getUserNotifications = async (req, res) => {
  const userEmail = req.user.email;

  try {
    const pool = await getPool();

    const request = pool.request();
    request.input("email", sql.NVarChar, userEmail);

    const result = await request.query(`
      SELECT *
      FROM Notifications
      WHERE
        IsDeleted = 0
        AND SenderEmail = 'maxcap@ihrp.sg'
        AND RecipientEmail LIKE '%' + @email + '%'
      ORDER BY CreatedAt DESC
    `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("❌ Get Notifications Error:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

// ===================== DELETE NOTIFICATION (SOFT DELETE) =====================
exports.deleteNotification = async (req, res) => {
  const { id } = req.params;
  const userEmail = req.user.email;

  try {
    const pool = await getPool();

    const request = pool.request();
    request.input("id", sql.Int, id);
    request.input("email", sql.NVarChar, userEmail);

    const result = await request.query(`
      UPDATE Notifications
      SET IsDeleted = 1
      WHERE Id = @id AND RecipientEmail LIKE '%' + @email + '%'
    `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Delete Notification Error:", err);
    res.status(500).json({ message: "Failed to delete notification" });
  }
};
