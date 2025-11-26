// controllers/actualsAIController.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const sql = require("mssql");

const dbConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: { encrypt: true, trustServerCertificate: false },
};

exports.getAIActualsRecommendation = async (req, res) => {
  const { projectTitle, effortLevel, manDays } = req.body;   // <-- FIXED
  const userId = req.user?.id;
  let activitySummary = "";

  // STEP 1 — Fetch ManicTime Activity
  if (userId) {
    try {
      const pool = await sql.connect(dbConfig);
      const query = `
        SELECT TOP 10 activityName, SUM(duration) AS totalDuration
        FROM [dbo].[manictime_summary] ms
        INNER JOIN [dbo].[Users] u ON u.DeviceName = ms.deviceName
        WHERE u.Id = @userId
        GROUP BY activityName
        ORDER BY totalDuration DESC;
      `;
      const result = await pool.request().input("userId", sql.Int, userId).query(query);
      await pool.close();

      activitySummary = result.recordset
        .map((a, idx) => `${idx + 1}. ${a.activityName} (${Math.round(a.totalDuration / 60)} mins)`)
        .join("\n");

    } catch (err) {
      console.error("⚠️ Failed to fetch ManicTime data:", err);
    }
  }

  // STEP 2 — Dynamic Prompt
  const prompt = `
You are an AI time management system.

Using the user's recent ManicTime activity + their declared project hours, generate a complete work allocation plan.

Rules:
1. No hardcoded categories — infer categories based on activity names.
2. "recommended_hours" must consider:
   - user's ManicTime performance
   - declared man-days (${manDays})
   - project effort level (${effortLevel})
3. Create 3–6 categories dynamically.
4. Total hours MUST equal recommended_hours.
5. Output only valid JSON.

JSON format:
{
  "recommendation": {
    "summary": "",
    "recommended_hours": <number>,
    "categories": [
      { "category": "", "hours": <number> }
    ],
    "rationale": ""
  }
}

User Activity Summary:
${activitySummary || "No activity tracked."}

Project Title: ${projectTitle}
Declared man-days: ${manDays}
Effort Level: ${effortLevel}
`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a JSON generator. Output only valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    const output = data?.choices?.[0]?.message?.content || "";

    let jsonOutput = {};
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/m);
      if (jsonMatch) jsonOutput = JSON.parse(jsonMatch[0].trim());
    } catch (err) {
      console.error("⚠️ JSON parse error:", err);
    }

    // NEW CLEAN FALLBACK
    const fallback = {
      recommendation: {
        summary: "AI failed to generate a structured output. Using fallback.",
        recommended_hours: 8,
        categories: [
          { category: "General Work", hours: 4 },
          { category: "Meetings", hours: 2 },
          { category: "Admin", hours: 2 }
        ],
        rationale: "Fallback distribution based on typical workloads."
      }
    };

    res.json({
      success: true,
      source: jsonOutput.recommendation ? "ai" : "fallback",
      recommendation: jsonOutput.recommendation || fallback.recommendation,
    });

  } catch (err) {
    console.error("Groq API error:", err);
    res.status(500).json({ error: "Failed to get AI time recommendation" });
  }
};
