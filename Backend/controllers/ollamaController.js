// controllers/ollamaController.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

exports.getAISuggestions = async (req, res) => {
  const { projectTitle, projectDescription, manDays, effortLevel } = req.body;

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
- Available Man-Days: ${manDays}
- Effort Level: ${effortLevel}

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
        model: "gemma-7b-it",
        messages: [
          {
            role: "system",
            content: `You are an AI that must respond **only in strict JSON**. 
Do not include explanations, notes, or markdown formatting. 
Return a single JSON object starting with { and ending with } exactly.`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const output = data?.choices?.[0]?.message?.content || "";
    console.log("🧠 Raw AI Output:", output); // <— ADD THIS LINE

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
