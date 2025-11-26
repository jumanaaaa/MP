// const axios = require("axios");
// const sql = require("mssql");
// const dotenv = require("dotenv");
// const { getValidManicTimeToken } = require("../middleware/manictimeauth");
// dotenv.config();

// const dbConfig = {
//   user: process.env.SQL_USER,
//   password: process.env.SQL_PASSWORD,
//   server: process.env.SQL_SERVER,
//   database: process.env.SQL_DATABASE,
//   options: { encrypt: true, trustServerCertificate: false },
// };

// const DEVICE_SUMMARY_TIMELINES = [
//   { deviceName: "IHRP-JUMHA-227", timelineKey: "0639b1d5-cd58-4888-88d8-1dfa01f28ade" },
//   { deviceName: "IHRP-WLT-061", timelineKey: "0639b1d5-cd58-4888-88d8-1dfa01f28ade" },
// ];

// async function fetchSummaryData(req, res) {
//   try {
//     // Use frontend-provided range OR default to today
//     const { fromTime: userFrom, toTime: userTo } = req.query;

//     const fromTime = userFrom ? new Date(userFrom) : new Date();
//     const toTime = userTo ? new Date(userTo) : new Date();

//     if (!userFrom) fromTime.setHours(0, 0, 0, 0);
//     if (!userTo) toTime.setHours(23, 59, 59, 999);

//     const formattedFrom = fromTime.toISOString();
//     const formattedTo = toTime.toISOString();

//     console.log(`📅 Fetching data from ${formattedFrom} → ${formattedTo}`);

//     // ✅ Token must be fetched *inside* the function
//     const token = await getValidManicTimeToken();

//     const pool = await sql.connect(dbConfig);
//     const insertedRecords = [];

//     // 🧹 Step 2: Delete old records for the same date range before inserting new ones
//     await pool.request()
//       .input("fromTime", sql.DateTime, fromTime)
//       .input("toTime", sql.DateTime, toTime)
//       .query(`
//         DELETE FROM [dbo].[manictime_summary]
//         WHERE startTime BETWEEN @fromTime AND @toTime
//       `);
//     console.log("🧹 Old records deleted for selected range");

//     // Fetch and insert new data
//     for (const device of DEVICE_SUMMARY_TIMELINES) {
//       const url = `${process.env.MANICTIME_URL}/${process.env.MANICTIME_WORKSPACE_ID}/api/timelines/${device.timelineKey}/activities` +
//             `?fromTime=${formattedFrom}&toTime=${formattedTo}`;
//       console.log(`📡 Fetching summary for ${device.deviceName}`);

//       const response = await axios.get(url, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           Accept: "application/vnd.manictime.v3+json"
//         },
//       });

//       const entities = response.data.entities || [];
//       for (const entity of entities) {
//         if (entity.entityType !== "activity") continue;
//         const { name, timeInterval, groupId } = entity.values;
//         const start = new Date(timeInterval.start);
//         const duration = parseInt(timeInterval.duration, 10);
//         if (!name || name.trim() === "") continue;

//         await pool.request()
//           .input("timelineKey", sql.NVarChar, device.timelineKey)
//           .input("deviceName", sql.NVarChar, device.deviceName)
//           .input("activityName", sql.NVarChar, name)
//           .input("startTime", sql.DateTime, start)
//           .input("duration", sql.Int, duration)
//           .input("groupId", sql.Int, groupId || null)
//           .query(`
//             INSERT INTO [dbo].[manictime_summary]
//             (timelineKey, deviceName, activityName, startTime, duration, groupId)
//             VALUES (@timelineKey, @deviceName, @activityName, @startTime, @duration, @groupId)
//           `);

//         insertedRecords.push({ device: device.deviceName, name, start, duration });
//       }
//     }

//     await pool.close();
//     console.log(`✅ Inserted ${insertedRecords.length} activities`);

//     if (res)
//       res.status(200).json({ message: "✅ Summary data fetched and stored", count: insertedRecords.length });
//     else
//       console.log(`✅ Summary data fetched and stored (${insertedRecords.length} activities, cron mode)`);

//   } catch (err) {
//     console.error("❌ Fetch Summary Error:", err.response?.data || err);
//     if (res)
//       res.status(500).json({ error: "Failed to fetch or store summary data" });
//   }
// }

// async function fetchUserSummary(req, res) {
//   try {
//     const userId = req.user.id; // later replace with req.user.id once auth applies

//     const pool = await sql.connect(dbConfig);
//     const userResult = await pool.request()
//       .input("userId", sql.Int, userId)
//       .query("SELECT DeviceName FROM [dbo].[Users] WHERE Id = @userId");

//     if (userResult.recordset.length === 0)
//       return res.status(404).json({ message: "User not found" });

//     const deviceName = userResult.recordset[0].DeviceName;

//     const activities = await pool.request()
//       .input("deviceName", sql.NVarChar, deviceName)
//       .query(`
//         SELECT TOP 1000 deviceName, activityName, startTime, duration
//         FROM [dbo].[manictime_summary]
//         WHERE deviceName = @deviceName
//         ORDER BY startTime DESC
//       `);

//     await pool.close();
//     res.status(200).json({ 
//       userDevice: deviceName,
//       count: activities.recordset.length,
//       activities: activities.recordset 
//     });
//   } catch (err) {
//     console.error("❌ Fetch user summary error:", err);
//     res.status(500).json({ error: "Failed to fetch user summary" });
//   }
// }


// module.exports = { fetchSummaryData, fetchUserSummary };


// ==============================
// manictimeController.js (FULL)
// ==============================

const axios = require("axios");
const sql = require("mssql");
const dotenv = require("dotenv");
const { getValidManicTimeToken } = require("../middleware/manictimeauth");
dotenv.config();

const dbConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: { encrypt: true, trustServerCertificate: false },
};

// 🖥️ Devices to fetch
const DEVICE_SUMMARY_TIMELINES = [
  { deviceName: "IHRP-JUMHA-227", timelineKey: "97c86719-8d5b-4378-874e-f43c260f8736" },
  { deviceName: "IHRP-WLT-061 (1)", timelineKey: "1aaffcc9-faa0-460b-8ee4-bb44ac85d92c" },
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

      const entities = response.data.entities || [];

      for (const entity of entities) {
        if (entity.entityType !== "activity") continue;

        const { name, timeInterval, groupId } = entity.values;
        if (!name || !name.trim()) continue;

        const start = new Date(timeInterval.start);
        const duration = parseInt(timeInterval.duration, 10);

        await pool.request()
          .input("timelineKey", sql.NVarChar, device.timelineKey)
          .input("deviceName", sql.NVarChar, device.deviceName)
          .input("activityName", sql.NVarChar, name)
          .input("startTime", sql.DateTime, start)
          .input("duration", sql.Int, duration)
          .input("groupId", sql.Int, groupId || null)
          .query(`
            INSERT INTO [dbo].[manictime_summary]
            (timelineKey, deviceName, activityName, startTime, duration, groupId)
            VALUES (@timelineKey, @deviceName, @activityName, @startTime, @duration, @groupId)
          `);

        insertedRecords.push({
          device: device.deviceName,
          name,
          start,
          duration
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

module.exports = { fetchSummaryData, fetchUserSummary };
