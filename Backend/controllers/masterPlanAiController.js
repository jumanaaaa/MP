// controllers/masterPlanAiController.js

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const sql = require("mssql");

const dbConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: { encrypt: true, trustServerCertificate: false },
};

exports.generateAIMasterPlan = async (req, res) => {
  const { project, startDate, endDate } = req.body;
  const userId = req.user?.id;

  if (!project || !startDate || !endDate) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // 🟦 STEP 1 — Fetch user's department
  let department = null;
  try {
    const pool = await sql.connect(dbConfig);
    const deptQuery = `
      SELECT Department
      FROM Users
      WHERE Id = @userId;
    `;
    const deptResult = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(deptQuery);

    department = deptResult.recordset[0]?.Department || null;
    await pool.close();

    if (!department) {
      return res.status(400).json({
        error: "User department not found. Cannot generate master plan.",
      });
    }
  } catch (err) {
    console.error("⚠️ Failed to get department:", err);
  }

  // 🟦 STEP 2 — Pull actuals of all users in the same department
  let departmentActuals = "";
  try {
    const pool = await sql.connect(dbConfig);
    const actualQuery = `
      SELECT u.FirstName, u.LastName, ms.activityName, SUM(ms.duration) AS totalDuration
      FROM manictime_summary ms
      INNER JOIN Users u ON u.DeviceName = ms.deviceName
      WHERE u.Department = @dept
      GROUP BY u.FirstName, u.LastName, ms.activityName
      ORDER BY u.FirstName, totalDuration DESC;
    `;

    const result = await pool
      .request()
      .input("dept", sql.NVarChar, department)
      .query(actualQuery);

    await pool.close();

    if (result.recordset.length === 0) {
      departmentActuals = "No activity records found for this department.";
    } else {
      departmentActuals = result.recordset
        .map(
          (row) =>
            `- ${row.FirstName} ${row.LastName}: ${row.activityName} (${Math.round(
              row.totalDuration / 60
            )} mins)`
        )
        .join("\n");
    }
  } catch (err) {
    console.error("⚠️ Failed to fetch department actuals:", err);
  }

  // 🟦 STEP 3 — AI Prompt
  const prompt = `
You are an expert in project forecasting and software delivery planning.

Using REAL workload data of all users from the ${department} department:

Department Activity Summary:
${departmentActuals}

Project: ${project}
Timeline: ${startDate} → ${endDate}

Generate a MASTER PLAN with realistic timeline phases:
- Discovery
- Development
- SIT
- UAT
- Deployment
- Documentation

Respond ONLY with STRICT JSON like:
{
  "Discovery": { "startDate": "...", "endDate": "...", "status": "Planned" },
  "Development": { ... },
  "SIT": { ... },
  "UAT": { ... },
  "Deployment": { ... },
  "Documentation": { ... }
}
  `;

  // 🟦 STEP 4 — RAW Groq API Request
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "You are a strict JSON generator. Always output valid JSON only.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
        }),
      }
    );

    const data = await response.json();
    const rawOutput = data?.choices?.[0]?.message?.content || "";

    console.log("🧠 Raw AI Output (MasterPlan):", rawOutput);

    // 🟦 STEP 5 — Parse JSON safely
    let jsonOutput = {};
    try {
      const match = rawOutput.match(/\{[\s\S]*\}/m);
      if (match) jsonOutput = JSON.parse(match[0].trim());
    } catch (err) {
      console.error("⚠️ JSON parse error:", err);
    }

    // 🟦 STEP 6 — Fallback Master Plan (if AI fails)
    const fallback = {
      Discovery: {
        startDate,
        endDate,
        status: "Planned",
      },
      Development: {
        startDate,
        endDate,
        status: "Planned",
      },
      SIT: {
        startDate,
        endDate,
        status: "Planned",
      },
      UAT: {
        startDate,
        endDate,
        status: "Planned",
      },
      Deployment: {
        startDate,
        endDate,
        status: "Planned",
      },
    };

    res.json({
      success: true,
      source: jsonOutput.Discovery ? "ai" : "fallback",
      masterPlan: jsonOutput.Discovery ? jsonOutput : fallback,
    });
  } catch (err) {
    console.error("Groq API error:", err);
    res.status(500).json({ error: "Failed to generate AI master plan" });
  }
};
