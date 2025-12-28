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

  console.log("🔍 Starting activity matching validation...");
  console.log(`📋 AI suggested ${matchedActivities.length} matches`);

  const enriched = matchedActivities
    .map((match, idx) => {
      if (!match.activityName) {
        console.log(`⚠️ Match ${idx + 1}: No activityName provided`);
        return null;
      }

      console.log(`\n🔎 Match ${idx + 1}: Looking for "${match.activityName}"`);

      // Try exact match first (case-insensitive)
      let activity = allActivities.find(
        a => a.name.toLowerCase() === match.activityName.toLowerCase()
      );

      // If no exact match, try partial match
      if (!activity) {
        console.log(`  ❌ No exact match, trying partial match...`);
        activity = allActivities.find(
          a => a.name.toLowerCase().includes(match.activityName.toLowerCase()) ||
            match.activityName.toLowerCase().includes(a.name.toLowerCase())
        );
      }

      if (!activity) {
        console.log(`  ❌ FILTERED OUT: "${match.activityName}" not found in ManicTime activities`);
        console.log(`  💡 AI confidence: ${match.confidence}, reason: ${match.reason}`);
        return null;
      }

      console.log(`  ✅ MATCHED: "${activity.name}" (${activity.hours}h) → Project: ${match.projectName}`);
      total += activity.hours;

      return {
        activityName: activity.name,
        projectName: match.projectName, // ✅ NOW INCLUDED
        confidence: match.confidence || 'low',
        reason: match.reason || 'Matched based on project context',
        hours: activity.hours
      };
    })
    .filter(Boolean);

  console.log(`\n📊 Final results: ${enriched.length} valid matches, ${total.toFixed(2)} hours`);

  return {
    enriched,
    total: Number(total.toFixed(2))
  };
};



exports.matchProjectToManicTime = async (req, res) => {
  const { projectNames, startDate, endDate, category } = req.body; // Now accepts array
  const userId = req.user.id;

  if (!projectNames || projectNames.length === 0 || !startDate || !endDate) {
    return res.status(400).json({
      message: "Missing required fields: projectNames, startDate, endDate"
    });
  }

  let pool;

  try {
    pool = await sql.connect(dbConfig);

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

    const totalHours = activities.reduce((sum, a) => sum + parseFloat(a.hours), 0).toFixed(2);

    // 🔍 Fetch AI Context for ALL projects
    const projectNamesParam = projectNames.join(',');

    const request = pool.request();

    projectNames.forEach((name, index) => {
      request.input(`projectName${index}`, sql.NVarChar, name);
    });

    const inClause = projectNames
      .map((_, index) => `@projectName${index}`)
      .join(',');

    const aiContextResult = await request.query(`
  SELECT 
    c.Id,
    c.Name,
    c.AiContext,
    c.ProjectType,
    r.ResourceType,
    r.Identifier,
    r.Description
  FROM Contexts c
  LEFT JOIN ContextResources r ON r.ContextId = c.Id
  WHERE c.Name IN (${inClause})
`);

    const hasAIContext = aiContextResult.recordset.length > 0;

    // Group resources by project
    const projectContexts = {};
    aiContextResult.recordset.forEach(row => {
      if (!projectContexts[row.Name]) {
        projectContexts[row.Name] = {
          aiContext: row.AiContext || '',
          resources: []
        };
      }

      if (row.Identifier) {
        projectContexts[row.Name].resources.push({
          type: row.ResourceType,
          value: row.Identifier,
          description: row.Description
        });
      }
    });

    // Build combined AI prompt
    const aiPrompt = hasAIContext
      ? `
You are an intelligent time tracking assistant matching ManicTime activities to multiple projects.

PROJECTS TO MATCH: ${projectNames.join(', ')}

🎯 MATCHING STRATEGY - MULTI-PROJECT MATCHING:

${Object.entries(projectContexts).map(([projectName, context]) => `
PROJECT: ${projectName}
CONFIGURED RESOURCES:
${context.resources.map(r => `- [${r.type.toUpperCase()}] ${r.value}${r.description ? ` (${r.description})` : ''}`).join('\n')}

AI CONTEXT:
${context.aiContext || '(No additional context)'}
`).join('\n\n')}

MATCHING RULES BY RESOURCE TYPE:

1️⃣ WEBSITE MATCHING (for "website" type):
   - Activity MUST contain the exact website URL/title
   - Example: "Vite + React - Google Chrome" matches resource "Vite + React"
   - ✅ HIGH confidence for exact matches

2️⃣ APPLICATION MATCHING (for "application" type):
   - Match if activity ENDS WITH or CONTAINS the application name
   - Example: "adminactuals.jsx - MaxCap - Visual Studio Code" matches "Visual Studio Code"
   - ✅ HIGH confidence if activity contains application name
   - ✅ MEDIUM confidence if file/project name suggests project work

3️⃣ FILE PATTERN MATCHING (for "file_pattern" type):
   - Match if activity contains the file pattern anywhere
   - ✅ MEDIUM to HIGH confidence depending on context

MANICTIME ACTIVITIES:
${activities.map((a, i) => `${i + 1}. "${a.name}" - ${a.hours}h`).join('\n')}

MATCHING PROCESS:
1. Check each activity against ALL configured resources from ALL projects
2. Match activities to the specific project they belong to
3. An activity can match MULTIPLE projects if applicable
4. Return which project each activity matches

Return JSON only:
{
  "matchedActivities": [
    {
      "activityName": "EXACT COPY from numbered list with quotes",
      "projectName": "which project this matches",
      "confidence": "high | medium",
      "reason": "matched [resource_type]: resource_name for [projectName]"
    }
  ],
  "totalMatchedHours": number,
  "summary": "Matched X hours across Y activities for ${projectNames.length} projects"
}
`
      : `
You are an intelligent time tracking assistant.

PROJECTS TO MATCH: ${projectNames.join(', ')}

⚠️ NO RESOURCES CONFIGURED - Using basic project name matching

MANICTIME ACTIVITIES:
${activities.map((a, i) => `${i + 1}. "${a.name}" - ${a.hours}h`).join('\n')}

MATCHING RULES:
- Match activities where the activity name contains any of the project names
- Assign each activity to the most relevant project
- Use MEDIUM or LOW confidence for name-based matches

Return JSON only:
{
  "matchedActivities": [
    {
      "activityName": "EXACT activity name from list",
      "projectName": "which project this matches",
      "confidence": "low | medium",
      "reason": "brief explanation"
    }
  ],
  "totalMatchedHours": number,
  "summary": "brief summary"
}
`;

    console.log("🤖 Sending AI matching request...");
    console.log(`🧠 Matching mode: ${hasAIContext ? 'L2 (Context-aware)' : 'L1 (Name-only)'}`);
    console.log(`📊 Matching ${projectNames.length} projects`);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a time tracking AI that matches project names to activity data. Always respond with valid JSON only. When matching activities, you MUST copy the activity names EXACTLY as they appear in the provided list."
        },
        {
          role: "user",
          content: aiPrompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 2000
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

      try {
        matchingResult = JSON.parse(cleanedResponse);
      } catch (directParseError) {
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

    const rawMatches =
      matchingResult.matchedActivities ||
      matchingResult.matched_activities ||
      [];

    console.log(`🎯 AI returned ${rawMatches.length} raw matches`);

    const { enriched, total } = sumMatchedActivityHours(rawMatches, activities);

    const normalizedMatching = {
      summary: matchingResult.summary || `AI matched activities across ${projectNames.length} projects`,
      totalMatchedHours: total,
      matchedActivities: enriched
    };

    res.status(200).json({
      success: true,
      projectNames,
      dateRange: { startDate, endDate },
      totalHoursInRange: parseFloat(totalHours),
      allActivities: activities,
      matching: normalizedMatching
    });


  } catch (err) {
    console.error("❌ Project matching error:", err);
    res.status(500).json({
      message: "Failed to match project",
      error: err.message
    });
  } finally {
  if (pool) {
    await pool.close();
  }
  
}};