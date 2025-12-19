// controllers/actualsAIController.js
const sql = require("mssql");
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const dbConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: { encrypt: true, trustServerCertificate: false },
};

// ❌ DELETE the old getAIActualsRecommendation function entirely

// ✅ KEEP ONLY THIS FUNCTION
exports.matchProjectToManicTime = async (req, res) => {
  const { projectName, startDate, endDate } = req.body;
  const userId = req.user.id;

  if (!projectName || !startDate || !endDate) {
    return res.status(400).json({
      message: "Missing required fields: projectName, startDate, endDate"
    });
  }

  try {
    const pool = await sql.connect(dbConfig);

    // Get user's device name
    const userResult = await pool.request()
      .input("userId", sql.Int, userId)
      .query("SELECT DeviceName FROM [dbo].[Users] WHERE Id = @userId");

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: "User device not found" });
    }

    const deviceName = userResult.recordset[0].DeviceName;

    // Get all ManicTime activities for the date range
    const activitiesResult = await pool.request()
      .input("deviceName", sql.NVarChar, deviceName)
      .input("startDate", sql.DateTime, new Date(startDate))
      .input("endDate", sql.DateTime, new Date(endDate))
      .query(`
        SELECT 
          activityName,
          SUM(duration) as totalSeconds,
          COUNT(*) as occurrences
        FROM [dbo].[manictime_summary]
        WHERE deviceName = @deviceName
          AND startTime >= @startDate
          AND startTime <= @endDate
        GROUP BY activityName
        ORDER BY totalSeconds DESC
      `);

    await pool.close();

    const activities = activitiesResult.recordset.map(a => ({
      name: a.activityName,
      hours: Number((a.totalSeconds / 3600).toFixed(2)),
      occurrences: a.occurrences
    }));

    // Calculate total hours
    const totalHours = activities.reduce((sum, a) => sum + parseFloat(a.hours), 0).toFixed(2);

    // Use AI to match project name to activities
    const aiPrompt = `You are an intelligent time tracking assistant. Match the project name to relevant ManicTime activities.

**Project Name:** ${projectName}

**ManicTime Activities (from ${startDate} to ${endDate}):**
${activities.map((a, i) => `${i + 1}. ${a.name} - ${a.hours} hours (${a.occurrences} sessions)`).join('\n')}

**Task:**
Identify which ManicTime activities are likely related to the project "${projectName}". Consider:
- Similar keywords
- Application names that match the project
- File paths or document names
- Common abbreviations
- VS Code, browser tabs, documents related to the project

Respond in this EXACT JSON format (no markdown):
{
  "matchedActivities": [
    {
      "activityName": "exact activity name from list",
      "hours": number,
      "confidence": "high|medium|low",
      "reason": "why this matches"
    }
  ],
  "totalMatchedHours": number,
  "summary": "brief explanation of matching"
}`;

    console.log("🤖 Sending AI matching request...");

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a time tracking AI that matches project names to activity data. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: aiPrompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 1500
    });

    const aiResponse = completion.choices[0]?.message?.content || "{}";
    console.log("✅ AI matching response received");

    // Parse AI response
    let matchingResult;
    try {
      const cleanedResponse = aiResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Try direct parse first
      try {
        matchingResult = JSON.parse(cleanedResponse);
      } catch (directParseError) {
        // Extract JSON object
        const firstBrace = cleanedResponse.indexOf('{');
        const lastBrace = cleanedResponse.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          const extractedJson = cleanedResponse.substring(firstBrace, lastBrace + 1);
          matchingResult = JSON.parse(extractedJson);
        } else {
          throw new Error("Could not find valid JSON");
        }
      }
    } catch (parseError) {
      console.error("❌ Failed to parse AI response:", parseError);
      return res.status(500).json({
        message: "AI generated invalid response",
        error: parseError.message
      });
    }

    res.status(200).json({
      success: true,
      projectName,
      dateRange: { startDate, endDate },
      totalHoursInRange: parseFloat(totalHours),
      allActivities: activities,
      matching: matchingResult
    });

  } catch (err) {
    console.error("❌ Project matching error:", err);
    res.status(500).json({
      message: "Failed to match project",
      error: err.message
    });
  }
};