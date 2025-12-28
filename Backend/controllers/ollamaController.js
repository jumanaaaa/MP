// controllers/ollamaController.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const sql = require("mssql");

const dbConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: { encrypt: true, trustServerCertificate: false },
};

exports.getAISuggestions = async (req, res) => {
  const { projectTitle, projectDescription, manDays, effortLevel } = req.body;

  // 🧠 Step 1: Try to load user's ManicTime activity summary (based on JWT)
  const userId = req.user?.id; // This will work once your route is protected with verifyToken()
  let activitySummary = "";

  if (userId) {
    try {
      const pool = await sql.connect(dbConfig);
      const query = `
        SELECT TOP 15 activityName, SUM(duration) as totalDuration
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
      console.log("📊 User Activity Summary Ready:\n", activitySummary);
    } catch (err) {
      console.error("⚠️ Failed to fetch activity summary:", err);
    }
  }

  if (!projectTitle || !projectDescription || !manDays || !effortLevel) {
    return res
      .status(400)
      .json({ error: "Missing fields: title, description, manDays, or effortLevel" });
  }

  const prompt = `
You are an experienced project manager AI.

Based on the following inputs, propose a realistic project plan:
- Project Title: ${projectTitle}
- Description: ${projectDescription}
- General context: ${projectContext}
- Available Man-Days: ${manDays}
- Effort Level: ${effortLevel}

Here is the user's recent work activity summary (from ManicTime):
${activitySummary || "No tracked activity data available."}

Please create a structured JSON plan:
{
  "proposal": {
    "summary": "short paragraph summarizing project goal and approach",
    "phases": [
      {
        "phase": "Phase Name",
        "tasks": [
          { "task": "Task name", "duration_days": 3, "effort_comment": "Short note" }
        ]
      }
    ],
    "estimated_total_duration": "4 weeks",
    "effort_allocation": {
      "total_man_days": 40,
      "effort_level": "medium"
    }
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
        model: "mixtral-8x7b",
        messages: [
          {
            role: "system",
            content: `You are an AI project planner that responds **strictly in JSON**. 
Rules:
1. Return only one JSON object starting with '{' and ending with '}'.
2. Do NOT include markdown, notes, or explanations.
3. Always include fields: "summary", "phases", "estimated_total_duration", "effort_allocation".
If uncertain, make reasonable assumptions and still output valid JSON.`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const output = data?.choices?.[0]?.message?.content || "";
    console.log("🧠 Raw AI Output:", output); // <—   LINE

    let jsonOutput = {};
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/m);
      if (jsonMatch) {
        try {
          jsonOutput = JSON.parse(jsonMatch[0].trim());
        } catch (e) {
          console.error("Failed to parse JSON:", e);
        }
      }
      if (jsonMatch) jsonOutput = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("JSON parse error:", err);
    }

    // === Handle missing or invalid JSON ===
    let finalProposal;

    if (jsonOutput.proposal && typeof jsonOutput.proposal === "object") {
      // ✅ Valid AI output
      finalProposal = jsonOutput.proposal;
    } else {
      // ⚠️ Fallback plan when AI fails
      console.warn("⚠️ Using fallback AI plan (invalid or missing JSON).");

      finalProposal = {
        summary: "⚠️ This is an auto-generated fallback plan because the AI could not produce a valid structured output.",
        phases: [
          {
            phase: "Planning",
            tasks: [
              { task: "Gather project requirements", duration_days: 2, effort_comment: "Review previous projects for guidance" },
              { task: "Define key milestones", duration_days: 1, effort_comment: "Coordinate with team leads" },
            ],
          },
          {
            phase: "Execution",
            tasks: [
              { task: "Develop and test core features", duration_days: 5, effort_comment: "Focus on functionality first" },
              { task: "Quality assurance", duration_days: 2, effort_comment: "Verify deliverables meet requirements" },
            ],
          },
          {
            phase: "Delivery",
            tasks: [
              { task: "Deploy to production", duration_days: 1, effort_comment: "Ensure all UAT feedback is addressed" },
              { task: "Conduct project retrospective", duration_days: 1, effort_comment: "Document learnings for future planning" },
            ],
          },
        ],
        estimated_total_duration: "2 weeks",
        effort_allocation: {
          total_man_days: manDays,
          effort_level: effortLevel,
          note: "This is a default fallback structure for reference only.",
        },
      };
    }

    res.json({
      success: true,
      source: jsonOutput.proposal ? "ai" : "fallback",
      proposal: finalProposal,
    });

  } catch (error) {
    console.error("Groq API error:", error);
    res.status(500).json({ error: "Failed to connect to Groq API,Please try again!" });
  }
};

