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
  const { projectTitle, effortLevel } = req.body;
  const userId = req.user?.id;
  let activitySummary = "";

  // 🧩 Step 1: Pull user's recent activity breakdown
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

  // 🧩 Step 2: Build the prompt
  const prompt = `
You are an AI time management assistant that helps professionals plan their working hours.

Analyze this user's recent activity data and recommend how they should allocate their working hours for the project "${projectTitle}" based on their productivity trends.

User Activity Summary:
${activitySummary || "No tracked activity available."}

Effort Level: ${effortLevel || "medium"}

Respond ONLY in strict JSON format like this:
{
  "recommendation": {
    "summary": "Brief description of how user should plan their time.",
    "suggested_allocation": {
      "recommended_hours": 8,
      "suggested_effort_distribution": [
        { "category": "Deep Work / Coding", "hours": 4 },
        { "category": "Meetings / Collaboration", "hours": 2 },
        { "category": "Documentation / Admin", "hours": 2 }
      ]
    },
    "rationale": "Short reason based on their recent activity and effort level."
  }
}`;

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
          {
            role: "system",
            content: `You are a precise JSON generator. 
Always output valid JSON with no markdown or explanations.`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    console.log("🔍 Full Groq response:", JSON.stringify(data, null, 2));
    console.log("🧠 Raw AI Output (Actuals):", data?.choices?.[0]?.message?.content || "⚠️ Empty message");

    const output = data?.choices?.[0]?.message?.content || "";
    console.log("🧠 Raw AI Output (Actuals):", output);

    let jsonOutput = {};
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/m);
      if (jsonMatch) jsonOutput = JSON.parse(jsonMatch[0].trim());
    } catch (err) {
      console.error("⚠️ JSON parse error (Actuals):", err);
    }

    // Fallback if invalid
    const fallback = {
      recommendation: {
        summary: "⚠️ AI could not generate a structured output. Using fallback time recommendation.",
        suggested_allocation: {
          recommended_hours: 8,
          suggested_effort_distribution: [
            { category: "Focused Work", hours: 4 },
            { category: "Meetings / Syncs", hours: 2 },
            { category: "Admin Tasks", hours: 2 },
          ],
        },
        rationale: "Based on average productivity trends for similar roles.",
      },
    };

    res.json({
      success: true,
      source: jsonOutput.recommendation ? "ai" : "fallback",
      recommendation: jsonOutput.recommendation || fallback.recommendation,
    });
  } catch (err) {
    console.error("Groq API error (Actuals):", err);
    res.status(500).json({ error: "Failed to get AI time recommendation" });
  }
};
