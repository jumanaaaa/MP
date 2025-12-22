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

const sumMatchedActivityHours = (matchedActivities, allActivities) => {
  let total = 0;

  const enriched = matchedActivities
    .map(match => {
      if (!match.activityName) return null;

      const activity = allActivities.find(
        a => a.name.toLowerCase().includes(match.activityName.toLowerCase())
      );

      // 🔥 HARD FILTER: drop invalid AI hallucinations
      if (!activity) return null;

      total += activity.hours;

      return {
        activityName: activity.name,
        confidence: match.confidence || 'low',
        reason: match.reason || 'Matched based on project context',
        hours: activity.hours
      };
    })
    .filter(Boolean); // 🚀 removes nulls

  return {
    enriched,
    total: Number(total.toFixed(2))
  };
};



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

    const activities = activitiesResult.recordset.map(a => ({
      name: a.activityName,
      hours: Number((a.totalSeconds / 3600).toFixed(2)),
      occurrences: a.occurrences
    }));

    // Calculate total hours
    const totalHours = activities.reduce((sum, a) => sum + parseFloat(a.hours), 0).toFixed(2);

    // 🔍 Fetch AI Context for this project (if exists)
    const aiContextResult = await pool.request()
      .input("ProjectName", sql.NVarChar, projectName)
      .query(`
    SELECT 
      c.Id,
      c.Name,
      c.AiContext,
      r.ResourceType,
      r.Identifier,
      r.Description
    FROM Contexts c
    LEFT JOIN ContextResources r ON r.ContextId = c.Id
    WHERE c.Name = @ProjectName
  `);

    const hasAIContext = aiContextResult.recordset.length > 0;

    const contextRow = aiContextResult.recordset[0];
    const aiContextText = contextRow?.AiContext || "";

    const contextResources = aiContextResult.recordset.map(r => ({
      type: r.ResourceType,
      value: r.Identifier,
      description: r.Description
    }));

    // Use AI to match project name to activities
    const aiPrompt = hasAIContext
      ? `
You are an intelligent time tracking assistant.

This project has VERIFIED CONTEXT information.

PROJECT NAME:
${projectName}

PROJECT CONTEXT:
${aiContextText}

KNOWN WEBSITES / TOOLS:
${contextResources.map(r => `- ${r.value} (${r.description || 'no description'})`).join('\n')}

MANICTIME ACTIVITIES:
${activities.map((a, i) => `${i + 1}. ${a.name} - ${a.hours}h`).join('\n')}

MATCHING RULES:
- You MUST choose activityName ONLY from the MANICTIME ACTIVITIES list below
- activityName MUST contain the text
- If no activity matches, DO NOT include it
- HIGH confidence: clear app / site / keyword match
- MEDIUM confidence: partial or indirect match
- LOW confidence: weak match but still relevant


Return JSON only:
{
  "matchedActivities": [
    {
      "activityName": "EXACT activity name from MANICTIME ACTIVITIES",
      "confidence": "high | medium | low",
      "reason": "short explanation"
    }
  ],
  "totalMatchedHours": number,
  "summary": string
}
`
      : `
You are an intelligent time tracking assistant.

PROJECT NAME:
${projectName}

MANICTIME ACTIVITIES:
${activities.map((a, i) => `${i + 1}. ${a.name} - ${a.hours}h`).join('\n')}

MATCHING RULES:
- Match by project name similarity only
- Use LOW or MEDIUM confidence accordingly

Return JSON only.
`;

    console.log("🤖 Sending AI matching request...");
    console.log(
      `🧠 Matching mode: ${hasAIContext ? 'L2 (Context-aware)' : 'L1 (Name-only)'}`
    );

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

    const aiMatchedActivities =
      matchingResult.matchedActivities ||
      matchingResult.matched_activities ||
      [];

    const rawMatches =
      matchingResult.matchedActivities ||
      matchingResult.matched_activities ||
      [];

    const { enriched, total } = sumMatchedActivityHours(rawMatches, activities);

    const normalizedMatching = {
      summary: matchingResult.summary || 'AI matched activities based on context',
      totalMatchedHours: total,
      matchedActivities: enriched
    };

    res.status(200).json({
      success: true,
      projectName,
      dateRange: { startDate, endDate },
      totalHoursInRange: parseFloat(totalHours),
      allActivities: activities,
      matching: normalizedMatching
    });


    await pool.close();


  } catch (err) {
    console.error("❌ Project matching error:", err);
    res.status(500).json({
      message: "Failed to match project",
      error: err.message
    });
  }
};