const express = require("express");
const router = express.Router();

const sql = require("mssql"); // ✅ REQUIRED
const dotenv = require("dotenv");
dotenv.config();

const verifyToken = require("../middleware/auth");
const { fetchSummaryData, fetchUserSummary, buildManicTimeSessions  } = require("../controllers/manictimeController");

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

module.exports = router;
