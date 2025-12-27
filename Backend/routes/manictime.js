const express = require("express");
const router = express.Router();

const sql = require("mssql"); // ✅ REQUIRED
const dotenv = require("dotenv");
dotenv.config();

const verifyToken = require("../middleware/auth");
const { fetchSummaryData, fetchUserSummary, buildManicTimeSessions, runHistoricalSync  } = require("../controllers/manictimeController");

router.get("/manictime/summary", fetchSummaryData);
router.get("/manictime/user-summary", verifyToken(), fetchUserSummary); 

// routes/manictime.js
router.get("/debug/fetch-summary", fetchSummaryData);

router.get("/debug/db-dump", async (req, res) => {
  try {
    const pool = await sql.connect({
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      server: process.env.SQL_SERVER,
      database: process.env.SQL_DATABASE,
      options: { encrypt: true, trustServerCertificate: false },
    });

    const result = await pool.request().query(`
      SELECT TOP 200
        deviceName,
        activityName,
        startTime,
        duration
      FROM manictime_summary
      ORDER BY startTime DESC
    `);

    await pool.close();

    res.json({
      count: result.recordset.length,
      data: result.recordset
    });

  } catch (err) {
    console.error("❌ DB dump error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔎 TEMP DEBUG: build sessions manually
router.get("/debug/build-sessions", async (req, res) => {
  try {
    const from = req.query.from || "2025-12-01";
    const to = req.query.to || "2025-12-31";

    await buildManicTimeSessions(
      new Date(from + "T00:00:00"),
      new Date(to + "T23:59:59")
    );

    res.json({ 
      message: "Sessions built successfully",
      from,
      to
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to build sessions" });
  }
});

router.post(
  "/manictime/historical-sync",
  verifyToken(["admin"]),
  runHistoricalSync
);

router.get("/manictime/devices", verifyToken(["admin"]), async (req, res) => {
  try {
    const pool = await sql.connect({
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      server: process.env.SQL_SERVER,
      database: process.env.SQL_DATABASE,
      options: { encrypt: true, trustServerCertificate: false },
    });

    const result = await pool.request().query(`
      SELECT 
        d.DeviceName,
        d.TimelineKey,
        d.IsActive,
        s.SubscriptionName,
        CASE 
          WHEN u.DeviceName IS NOT NULL THEN 1
          ELSE 0
        END as IsAssigned
      FROM ManicTimeDevices d
      INNER JOIN ManicTimeSubscriptions s ON d.SubscriptionId = s.Id
      LEFT JOIN Users u ON d.DeviceName = u.DeviceName
      WHERE s.IsActive = 1
      ORDER BY 
        d.IsActive DESC,
        IsAssigned ASC,
        d.DeviceName
    `);

    await pool.close();
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch devices" });
  }
});

const dbConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: { encrypt: true, trustServerCertificate: false },
};

// GET ALL SUBSCRIPTIONS
router.get("/manictime-admin/subscriptions", verifyToken(["admin"]), async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT 
        Id,
        SubscriptionName,
        WorkspaceId,
        ClientId,
        ClientSecret,
        BaseUrl,
        IsActive,
        CreatedAt,
        UpdatedAt
      FROM ManicTimeSubscriptions
      ORDER BY SubscriptionName
    `);
    await pool.close();
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching subscriptions:", err);
    res.status(500).json({ message: "Failed to fetch subscriptions" });
  }
});

// CREATE SUBSCRIPTION
router.post("/manictime-admin/subscriptions", verifyToken(["admin"]), async (req, res) => {
  const { SubscriptionName, WorkspaceId, ClientId, ClientSecret, BaseUrl } = req.body;

  if (!SubscriptionName || !WorkspaceId || !ClientId || !ClientSecret) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input("SubscriptionName", sql.NVarChar, SubscriptionName)
      .input("WorkspaceId", sql.NVarChar, WorkspaceId)
      .input("ClientId", sql.NVarChar, ClientId)
      .input("ClientSecret", sql.NVarChar, ClientSecret)
      .input("BaseUrl", sql.NVarChar, BaseUrl || 'https://cloud.manictime.com')
      .query(`
        INSERT INTO ManicTimeSubscriptions 
        (SubscriptionName, WorkspaceId, ClientId, ClientSecret, BaseUrl, IsActive)
        OUTPUT INSERTED.*
        VALUES (@SubscriptionName, @WorkspaceId, @ClientId, @ClientSecret, @BaseUrl, 1)
      `);
    await pool.close();
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error("Error creating subscription:", err);
    res.status(500).json({ message: "Failed to create subscription" });
  }
});

// UPDATE SUBSCRIPTION
router.put("/manictime-admin/subscriptions/:id", verifyToken(["admin"]), async (req, res) => {
  const { id } = req.params;
  const { SubscriptionName, WorkspaceId, ClientId, ClientSecret, BaseUrl, IsActive } = req.body;

  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("Id", sql.Int, id)
      .input("SubscriptionName", sql.NVarChar, SubscriptionName)
      .input("WorkspaceId", sql.NVarChar, WorkspaceId)
      .input("ClientId", sql.NVarChar, ClientId)
      .input("ClientSecret", sql.NVarChar, ClientSecret)
      .input("BaseUrl", sql.NVarChar, BaseUrl || 'https://cloud.manictime.com')
      .input("IsActive", sql.Bit, IsActive)
      .query(`
        UPDATE ManicTimeSubscriptions
        SET 
          SubscriptionName = @SubscriptionName,
          WorkspaceId = @WorkspaceId,
          ClientId = @ClientId,
          ClientSecret = @ClientSecret,
          BaseUrl = @BaseUrl,
          IsActive = @IsActive,
          UpdatedAt = GETDATE()
        WHERE Id = @Id
      `);
    await pool.close();
    res.json({ message: "Subscription updated successfully" });
  } catch (err) {
    console.error("Error updating subscription:", err);
    res.status(500).json({ message: "Failed to update subscription" });
  }
});

// DELETE SUBSCRIPTION
router.delete("/manictime-admin/subscriptions/:id", verifyToken(["admin"]), async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("Id", sql.Int, id)
      .query("DELETE FROM ManicTimeSubscriptions WHERE Id = @Id");
    await pool.close();
    res.json({ message: "Subscription deleted successfully" });
  } catch (err) {
    console.error("Error deleting subscription:", err);
    res.status(500).json({ message: "Failed to delete subscription" });
  }
});

module.exports = router;
