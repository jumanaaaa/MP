
// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// exports.getAISuggestions = async (req, res) => {
//   const { projectTitle, projectDescription } = req.body;

//   if (!projectTitle || !projectDescription) {
//     return res.status(400).json({ error: "Missing project details" });
//   }

//   const prompt = `
//   You are an AI assistant that recommends project fields based on details.
//   Analyze the input and suggest relevant categories or keywords.

//   Project Title: ${projectTitle}
//   Description: ${projectDescription}

//   Respond ONLY in JSON format:
//   {
//     "suggestions": ["tag1", "tag2", "tag3"]
//   }
//   `;

//   try {
//     const response = await fetch("http://localhost:11434/api/generate", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         model: "gemma3:1b", // your installed Ollama model
//         prompt,
//         stream: false,
//       }),
//     });

//     const data = await response.json();
//     const output = data.response || "";

//     // Extract JSON safely
//     let jsonOutput = {};
//     try {
//       const jsonMatch = output.match(/\{[\s\S]*\}/);
//       if (jsonMatch) jsonOutput = JSON.parse(jsonMatch[0]);
//     } catch (err) {
//       console.error("Parse error:", err);
//     }

//     res.json({
//       success: true,
//       suggestions: jsonOutput.suggestions || ["No valid suggestions found"],
//     });
//   } catch (error) {
//     console.error("Ollama API error:", error);
//     res.status(500).json({ error: "Failed to connect to Ollama API" });
//   }
// };

// exports.getAISuggestions = async (req, res) => {
//   const { projectTitle, projectDescription } = req.body;

//   if (!projectTitle || !projectDescription) {
//     return res.status(400).json({ error: "Missing project details" });
//   }

//   const prompt = `
//   You are an AI assistant that recommends project fields based on details.
//   Analyze the input and suggest relevant categories or keywords.

//   Project Title: ${projectTitle}
//   Description: ${projectDescription}

//   Respond ONLY in JSON format:
//   {
//     "suggestions": ["tag1", "tag2", "tag3"]
//   }
//   `;

//   try {
//     const response = await fetch("http://localhost:11434/api/generate", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         model: "gemma3:1b",
//         prompt,
//         stream: false,
//       }),
//     });

//     const data = await response.json();
//     const output = data.response || "";

//     let jsonOutput = {};
//     try {
//       const jsonMatch = output.match(/\{[\s\S]*\}/);
//       if (jsonMatch) jsonOutput = JSON.parse(jsonMatch[0]);
//     } catch (err) {
//       console.error("Parse error:", err);
//     }

//     res.json({
//       success: true,
//       suggestions: jsonOutput.suggestions || ["No valid suggestions found"],
//     });
//   } catch (error) {
//     console.error("Ollama API error:", error);
//     res.status(500).json({ error: "Failed to connect to Ollama API" });
//   }
// };


exports.getAISuggestions = async (req, res) => {
  const { projectTitle, projectDescription, manDays, effortLevel } = req.body;

  if (!projectTitle || !projectDescription || !manDays || !effortLevel) {
    return res.status(400).json({ error: "Missing fields: title, description, manDays, or effortLevel" });
  }

  // 🧠 AI prompt logic
  const prompt = `
  You are an experienced project manager AI.

  Based on the following inputs, propose a realistic project plan:
  - Project Title: ${projectTitle}
  - Description: ${projectDescription}
  - Available Man-Days: ${manDays}
  - Effort Level: ${effortLevel} (e.g. low, medium, high)

  Please create a structured JSON plan that includes:
  1. Key project phases (e.g., Planning, Design, Development, Testing, Delivery)
  2. Tasks under each phase with estimated duration (in man-days)
  3. Suggested team allocation or effort distribution if applicable
  4. Total estimated project timeline (in weeks)
  5. A short executive summary of the proposal

  Respond **strictly in JSON** in this format:

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
  }
  `;

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3:1b", // your Ollama model
        prompt,
        stream: false,
      }),
    });

    const data = await response.json();
    const output = data.response || "";

    // Try to extract JSON safely
    let jsonOutput = {};
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonOutput = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("Parse error:", err);
    }

    res.json({
      success: true,
      proposal: jsonOutput.proposal || { message: "No valid plan generated" },
    });
  } catch (error) {
    console.error("Ollama API error:", error);
    res.status(500).json({ error: "Failed to connect to Ollama API" });
  }
};
