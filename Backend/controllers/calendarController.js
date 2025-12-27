const axios = require("axios");
const { sql, getPool } = require("../db/pool");
exports.getCalendarEvents = async (req, res) => {
  try {
    console.log("\n================ FETCHING CALENDAR ================");
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    console.log("📧 User:", userEmail);
    console.log("🆔 User ID:", userId);

    // Get stored Microsoft token from database
    const pool = await getPool();
    const request = pool.request();
    request.input("userId", sql.Int, userId);
    
    const result = await request.query(`
      SELECT MicrosoftAccessToken, MicrosoftTokenExpiry 
      FROM Users 
      WHERE Id = @userId
    `);
    
    if (result.recordset.length === 0) {
      console.error("❌ User not found in database");
      return res.status(404).json({ error: "User not found" });
    }
    
    const user = result.recordset[0];
    const accessToken = user.MicrosoftAccessToken;
    const tokenExpiry = user.MicrosoftTokenExpiry;
    
    if (!accessToken) {
      console.error("❌ No Microsoft access token stored");
      return res.status(401).json({ 
        error: "No Microsoft access token. Please log in with Microsoft." 
      });
    }
    
    // Check if token is expired
    if (tokenExpiry && new Date(tokenExpiry) < new Date()) {
      console.error("⚠️ Microsoft token expired");
      return res.status(401).json({ 
        error: "Microsoft token expired. Please log in again." 
      });
    }

    // Fetch calendar events
    console.log("📅 Fetching calendar from Microsoft Graph...");
    
    const start = new Date(Date.now() - 30 * 86400000).toISOString(); // past 30 days
    const end = new Date(Date.now() + 30 * 86400000).toISOString();   // next 30 days

    const graphResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start}&endDateTime=${end}&$orderby=start/dateTime&$top=200`,
      {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Fetched", graphResponse.data.value?.length || 0, "events");
    console.log("================================================\n");

    const { DateTime } = require("luxon");

    // Convert events to SGT
    const eventsSGT = (graphResponse.data.value || []).map(evt => {
      const start = DateTime.fromISO(evt.start.dateTime, { zone: evt.start.timeZone || "utc" })
        .setZone("Asia/Singapore")
        .toISO();

      const end = DateTime.fromISO(evt.end.dateTime, { zone: evt.end.timeZone || "utc" })
        .setZone("Asia/Singapore")
        .toISO();

      return {
        ...evt,
        start: { ...evt.start, dateTime: start, timeZone: "Asia/Singapore" },
        end: { ...evt.end, dateTime: end, timeZone: "Asia/Singapore" }
      };
    });

    return res.json({
      events: eventsSGT
    });

  } catch (err) {
    console.error("❌ Calendar Error:", err.response?.data || err.message);
    
    if (err.response?.status === 401) {
      return res.status(401).json({ 
        error: "Microsoft token invalid or expired. Please log in again." 
      });
    }
    
    return res.status(500).json({ 
      error: "Failed to fetch calendar",
      details: err.message
    });
  }
};