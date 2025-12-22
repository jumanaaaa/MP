
// ==============================
// manictimeController.js (FULL)
// ==============================

const axios = require("axios");
const sql = require("mssql");
const dotenv = require("dotenv");
const { getValidManicTimeToken } = require("../middleware/manictimeauth");
const { normalizeManicTimeEntities } = require("../utils/manictimeNormalizer");
dotenv.config();

const dbConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: { encrypt: true, trustServerCertificate: false },
};

// 🖥️ Devices to fetch
// 🖥️ Application timelines (CORRECT)
const DEVICE_SUMMARY_TIMELINES = [
  {
    deviceName: "IHRP-JUMHA-227",
    timelineKey: "487438a8-dd17-4016-9f9c-e4b111331d4f"
  },
  {
    deviceName: "IHRP-WLT-061 (1)",
    timelineKey: "0639b1d5-cd58-4888-88d8-1dfa01f28ade"
  }
];


// ==============================
// SAFE fetchSummaryData
// Works for BOTH:
//  🔹 CRON jobs (no req/res)
//  🔹 API calls (normal req/res)
// ==============================

async function fetchSummaryData(req = null, res = null) {
  try {
    // 🟦 Detect if HTTP request or CRON
    const userFrom = req?.query?.fromTime || null;
    const userTo = req?.query?.toTime || null;

    const fromTime = userFrom ? new Date(userFrom) : new Date();
    const toTime = userTo ? new Date(userTo) : new Date();

    // Default range = today
    if (!userFrom) fromTime.setHours(0, 0, 0, 0);
    if (!userTo) toTime.setHours(23, 59, 59, 999);

    const formattedFrom = fromTime.toISOString();
    const formattedTo = toTime.toISOString();

    console.log(`📅 ManicTime Summary Fetch: ${formattedFrom} → ${formattedTo}`);

    // 🔐 Always get valid token inside function
    const token = await getValidManicTimeToken();

    const pool = await sql.connect(dbConfig);
    const insertedRecords = [];


    // ==============================
    // 🧹 DELETE OLD RECORDS FIRST
    // ==============================

    await pool.request()
      .input("fromTime", sql.DateTime, fromTime)
      .input("toTime", sql.DateTime, toTime)
      .query(`
        DELETE FROM [dbo].[manictime_summary]
        WHERE startTime BETWEEN @fromTime AND @toTime
      `);

    console.log("🧹 Old records cleared");


    // ==============================
    // 📡 Fetch new data for each device
    // ==============================

    for (const device of DEVICE_SUMMARY_TIMELINES) {
      const url =
        `${process.env.MANICTIME_URL}/${process.env.MANICTIME_WORKSPACE_ID}/api/timelines/${device.timelineKey}/activities` +
        `?fromTime=${formattedFrom}&toTime=${formattedTo}`;

      console.log(`📡 Fetching summary → ${device.deviceName}`);

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.manictime.v3+json"
        },
      });

      const rawEntities = response.data.entities || [];

      console.log("🔎 RAW entities count:", rawEntities.length);

      if (rawEntities.length > 0) {
        console.log(
          "🧪 SAMPLE ENTITY (FIRST ONE):",
          JSON.stringify(rawEntities[0], null, 2)
        );
      }

      const normalizedActivities = normalizeManicTimeEntities(rawEntities);
      console.log(
        `🧪 Normalized activities: ${normalizedActivities.length}`
      );

      for (const activity of normalizedActivities) {
        await pool.request()
          .input("timelineKey", sql.NVarChar, device.timelineKey)
          .input("deviceName", sql.NVarChar, device.deviceName)
          .input("activityName", sql.NVarChar, activity.name)
          .input("startTime", sql.DateTime, activity.start)
          .input("duration", sql.Int, activity.duration)
          .input("groupId", sql.Int, activity.groupId)
          .query(`
      INSERT INTO [dbo].[manictime_summary]
      (timelineKey, deviceName, activityName, startTime, duration, groupId)
      VALUES (@timelineKey, @deviceName, @activityName, @startTime, @duration, @groupId)
    `);

        insertedRecords.push({
          device: device.deviceName,
          name: activity.name,
          start: activity.start,
          duration: activity.duration
        });
      }
    }

    await pool.close();

    console.log(`✅ Inserted ${insertedRecords.length} activity records`);


    // ==============================
    // HTTP Response mode
    // ==============================
    if (res) {
      return res.status(200).json({
        message: "Summary data fetched and stored successfully",
        count: insertedRecords.length
      });
    }

    // ==============================
    // CRON Mode
    // ==============================
    return true;

  } catch (err) {
    console.error("❌ Fetch Summary Error:", err);

    if (res) {
      return res.status(500).json({ error: "Failed to fetch summary" });
    }

    return false;
  }
}

// ==============================
// Build ManicTime Work Sessions
// ==============================
async function buildManicTimeSessions(fromDate, toDate) {
  const IDLE_GRACE_MINUTES = 10;
  const IDLE_GRACE_MS = IDLE_GRACE_MINUTES * 60 * 1000;

  try {
    const pool = await sql.connect(dbConfig);

    // 1️⃣ Fetch clean activity rows
    const result = await pool.request()
      .input("fromDate", sql.DateTime, fromDate)
      .input("toDate", sql.DateTime, toDate)
      .query(`
        SELECT deviceName, activityName, startTime, duration
        FROM manictime_summary
        WHERE startTime BETWEEN @fromDate AND @toDate
          AND activityName NOT IN ('Session lock', 'Power off', 'ManicTime')
        ORDER BY deviceName, startTime
      `);

    const rows = result.recordset;
    console.log(`🧠 Session builder: ${rows.length} rows`);

    let currentSession = null;

    for (const row of rows) {
      const activityStart = new Date(row.startTime);
      const activityEnd = new Date(activityStart.getTime() + row.duration * 1000);

      // First session
      if (!currentSession) {
        currentSession = {
          deviceName: row.deviceName,
          start: activityStart,
          end: activityEnd
        };
        continue;
      }

      // Different device → force new session
      if (row.deviceName !== currentSession.deviceName) {
        await insertSession(pool, currentSession);
        currentSession = {
          deviceName: row.deviceName,
          start: activityStart,
          end: activityEnd
        };
        continue;
      }

      const gap = activityStart - currentSession.end;

      // Within idle grace → extend session
      if (gap <= IDLE_GRACE_MS) {
        currentSession.end = activityEnd;
      } 
      // Hard break → close session
      else {
        await insertSession(pool, currentSession);
        currentSession = {
          deviceName: row.deviceName,
          start: activityStart,
          end: activityEnd
        };
      }
    }

    // Final flush
    if (currentSession) {
      await insertSession(pool, currentSession);
    }

    await pool.close();
    console.log("✅ ManicTime sessions built successfully");

  } catch (err) {
    console.error("❌ Session build error:", err);
  }
}

async function insertSession(pool, session) {
  const durationSeconds = Math.floor(
    (session.end - session.start) / 1000
  );

  // Ignore tiny noise sessions (< 2 mins)
  if (durationSeconds < 120) return;

  await pool.request()
    .input("deviceName", sql.NVarChar, session.deviceName)
    .input("sessionStart", sql.DateTime, session.start)
    .input("sessionEnd", sql.DateTime, session.end)
    .input("duration", sql.Int, durationSeconds)
    .query(`
      INSERT INTO manictime_sessions
      (DeviceName, SessionStart, SessionEnd, DurationSeconds)
      VALUES (@deviceName, @sessionStart, @sessionEnd, @duration)
    `);
}

// ==============================
// Fetch summary for specific user
// ==============================

async function fetchUserSummary(req, res) {
  try {
    const userId = req.user.id;

    const pool = await sql.connect(dbConfig);
    const userResult = await pool.request()
      .input("userId", sql.Int, userId)
      .query("SELECT DeviceName FROM [dbo].[Users] WHERE Id = @userId");

    if (userResult.recordset.length === 0)
      return res.status(404).json({ message: "User not found" });

    const deviceName = userResult.recordset[0].DeviceName;

    const activities = await pool.request()
      .input("deviceName", sql.NVarChar, deviceName)
      .query(`
        SELECT TOP 1000 deviceName, activityName, startTime, duration
        FROM [dbo].[manictime_summary]
        WHERE deviceName = @deviceName
        ORDER BY startTime DESC
      `);

    await pool.close();

    res.status(200).json({
      userDevice: deviceName,
      count: activities.recordset.length,
      activities: activities.recordset
    });

  } catch (err) {
    console.error("❌ Fetch user summary error:", err);
    res.status(500).json({ error: "Failed to fetch user summary" });
  }
}

// Fetch ManicTime hours for specific user and date range
async function getUserHoursForDateRange(req, res) {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start and end dates required" });
    }

    const pool = await sql.connect(dbConfig);

    // Get user's device name
    const userResult = await pool.request()
      .input("userId", sql.Int, userId)
      .query("SELECT DeviceName FROM [dbo].[Users] WHERE Id = @userId");

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: "User device not found" });
    }

    const deviceName = userResult.recordset[0].DeviceName;

    // Get total hours from ManicTime for date range
    const hoursResult = await pool.request()
      .input("deviceName", sql.NVarChar, deviceName)
      .input("startDate", sql.DateTime, new Date(startDate))
      .input("endDate", sql.DateTime, new Date(endDate))
      .query(`
        SELECT 
          SUM(duration) as totalSeconds,
          COUNT(*) as activityCount
        FROM [dbo].[manictime_summary]
        WHERE deviceName = @deviceName
          AND startTime >= @startDate
          AND startTime <= @endDate
      `);

    const totalSeconds = hoursResult.recordset[0].totalSeconds || 0;
    const totalHours = (totalSeconds / 3600).toFixed(2);
    const activityCount = hoursResult.recordset[0].activityCount || 0;

    await pool.close();

    res.status(200).json({
      totalHours: parseFloat(totalHours),
      totalSeconds,
      activityCount,
      deviceName
    });

  } catch (err) {
    console.error("❌ Get user hours error:", err);
    res.status(500).json({ error: "Failed to fetch ManicTime hours" });
  }
}

async function runHistoricalSync(req, res) {
  const { fromDate, toDate } = req.body;

  if (!fromDate || !toDate) {
    return res.status(400).json({ message: "Missing parameters" });
  }

  try {
    // Fake req object to reuse fetchSummaryData
    const fakeReq = {
      query: {
        fromTime: fromDate,
        toTime: toDate
      }
    };

    // Call existing logic
    await fetchSummaryData(fakeReq, null);

    res.json({
      message: "Historical sync completed",
      fromDate,
      toDate,
      scope: "ALL devices"
    });

  } catch (err) {
    console.error("Historical Sync Error:", err);
    res.status(500).json({ message: "Historical sync failed" });
  }
};


module.exports = { 
  fetchSummaryData, 
  fetchUserSummary, 
  getUserHoursForDateRange,
  buildManicTimeSessions,
  runHistoricalSync
};
