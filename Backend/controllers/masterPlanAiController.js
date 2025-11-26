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
  const { project, startDate, endDate, userQuery, searchOnline } = req.body;
  const userId = req.user?.id;

  console.log("📋 Master Plan AI Request:", { 
    project, 
    startDate, 
    endDate, 
    hasQuery: !!userQuery,
    searchOnline: !!searchOnline 
  });

  if (!project || !startDate || !endDate) {
    return res.status(400).json({ error: "Missing required fields: project, startDate, endDate" });
  }

  // Check API key
  if (!process.env.GROQ_API_KEY) {
    console.error("❌ GROQ_API_KEY not found in environment variables!");
    return res.status(500).json({ error: "Groq API key not configured" });
  }
  console.log("✅ Groq API key found, length:", process.env.GROQ_API_KEY.length);

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

    console.log(`🏢 User Department: ${department}`);
  } catch (err) {
    console.error("⚠️ Failed to get department:", err);
    return res.status(500).json({ error: "Failed to retrieve user department" });
  }

  // 🟦 STEP 2 — Pull actuals of all users in the same department
  let departmentActuals = "";
  let actualsData = [];
  
  try {
    const pool = await sql.connect(dbConfig);
    
    // Get historical project actuals from the Actuals table
    const actualsQuery = `
      SELECT 
        u.FirstName, 
        u.LastName, 
        a.Category,
        a.Project,
        a.StartDate,
        a.EndDate,
        a.Hours
      FROM Actuals a
      INNER JOIN Users u ON u.Id = a.UserId
      WHERE u.Department = @dept
        AND a.Category != 'Admin'  -- Exclude leave/admin entries
      ORDER BY a.StartDate DESC;
    `;

    const result = await pool
      .request()
      .input("dept", sql.NVarChar, department)
      .query(actualsQuery);

    await pool.close();
    
    actualsData = result.recordset;
    console.log(`📊 Found ${actualsData.length} actual entries for ${department}`);

    if (actualsData.length === 0) {
      departmentActuals = "No historical project data found for this department. Generating plan based on industry standards.";
    } else {
      // Group by project and calculate statistics
      const projectStats = {};
      
      actualsData.forEach(row => {
        const projectName = row.Project || row.Category;
        if (!projectStats[projectName]) {
          projectStats[projectName] = {
            totalHours: 0,
            contributors: new Set(),
            phases: new Set(),
            startDate: row.StartDate,
            endDate: row.EndDate
          };
        }
        
        projectStats[projectName].totalHours += row.Hours;
        projectStats[projectName].contributors.add(`${row.FirstName} ${row.LastName}`);
        projectStats[projectName].phases.add(row.Category);
        
        // Track earliest start and latest end
        if (new Date(row.StartDate) < new Date(projectStats[projectName].startDate)) {
          projectStats[projectName].startDate = row.StartDate;
        }
        if (new Date(row.EndDate) > new Date(projectStats[projectName].endDate)) {
          projectStats[projectName].endDate = row.EndDate;
        }
      });

      // Format actuals summary for AI
      departmentActuals = Object.entries(projectStats)
        .map(([projectName, stats]) => {
          const manDays = (stats.totalHours / 8).toFixed(1);
          const duration = Math.ceil(
            (new Date(stats.endDate) - new Date(stats.startDate)) / (1000 * 60 * 60 * 24)
          );
          
          return `Project: ${projectName}
  - Total Effort: ${manDays} man-days (${stats.totalHours} hours)
  - Duration: ${duration} calendar days
  - Team Size: ${stats.contributors.size} contributors
  - Phases Worked: ${Array.from(stats.phases).join(", ")}`;
        })
        .join("\n\n");
      
      console.log("📈 Department Actuals Summary Generated");
    }
  } catch (err) {
    console.error("⚠️ Failed to fetch department actuals:", err);
    departmentActuals = "Unable to retrieve historical data.";
  }

  // 🟦 STEP 2.5 — Skip Web Search (Completely Free - No Setup Required)
  // Web search disabled to keep everything 100% free with zero setup
  const webSearchContext = "";
  
  if (searchOnline) {
    console.log("ℹ️ Web search requested but disabled (keeping system 100% free)");
    console.log("   System uses department actuals + user query only");
  }

  // 🟦 STEP 3 — Calculate project timeline
  // Convert DD/MM/YYYY to proper Date object
  const parseDate = (dateStr) => {
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day); // month is 0-indexed
  };

  const projectStartDate = parseDate(startDate);
  const projectEndDate = parseDate(endDate);
  const totalDays = Math.ceil((projectEndDate - projectStartDate) / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.ceil(totalDays / 7);

  console.log(`📅 Project Duration: ${totalDays} days (${totalWeeks} weeks)`);

  // 🟦 STEP 4 — Build AI Prompt
  // Format dates for prompt (YYYY-MM-DD)
  const formatDateForPrompt = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formattedStartDate = formatDateForPrompt(projectStartDate);
  const formattedEndDate = formatDateForPrompt(projectEndDate);

  const basePrompt = `You are an expert project manager specializing in realistic timeline planning for the ${department} department.

PROJECT DETAILS:
- Project Name: ${project}
- Timeline: ${formattedStartDate} to ${formattedEndDate} (${totalDays} days / ${totalWeeks} weeks)
${userQuery ? `\nPROJECT SCOPE & REQUIREMENTS:\n${userQuery}\n` : ''}

HISTORICAL DATA FROM ${department} DEPARTMENT:
${departmentActuals}
${webSearchContext}

CRITICAL TASK:
You MUST generate a realistic MASTER PLAN with AT LEAST 4-6 distinct project phases/milestones.

MANDATORY REQUIREMENTS:
1. Generate MINIMUM 4 phases, MAXIMUM 8 phases
2. Each phase must be a DISTINCT work stage (not "Project" or generic wrapper)
3. Use phase names from the historical data when available
4. If historical data shows phases like "Development", "Testing", "UAT" - USE THOSE
5. Phase names must be SPECIFIC (e.g., "System Development" not just "Phase 1")
6. All phases must fit within the ${totalWeeks}-week timeline
7. Phases must be sequential and non-overlapping
8. Each phase should take at least 1 week

PHASE NAMING RULES:
- ✅ GOOD: "Requirements Gathering", "System Development", "Integration Testing", "User Acceptance Testing", "Deployment"
- ❌ BAD: "Project", "Phase 1", "Work", "Tasks", "Milestone"

EXAMPLES OF VALID PHASE STRUCTURES:

For a ${totalWeeks}-week project, typical structures:

OPTION 1 - Traditional SDLC (5 phases):
- Requirements & Planning
- Development
- System Testing
- User Acceptance Testing  
- Deployment & Go-Live

OPTION 2 - Agile Approach (6 phases):
- Discovery & Planning
- Sprint 1 Development
- Sprint 2 Development
- Integration Testing
- UAT & Refinement
- Production Release

OPTION 3 - Based on Historical Data:
${actualsData.length > 0 ? `
Common phases used in ${department}:
${[...new Set(actualsData.map(a => a.Category))].slice(0, 8).join(', ')}

USE THESE PHASE NAMES or similar variations!
` : ''}

OUTPUT FORMAT:
Respond with ONLY valid JSON. NO markdown, NO code blocks, NO explanations.

STRUCTURE (must have 4-6 phases minimum):
{
  "Phase Name 1": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "status": "Planned"
  },
  "Phase Name 2": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "status": "Planned"
  },
  "Phase Name 3": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "status": "Planned"
  },
  "Phase Name 4": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "status": "Planned"
  }
}

CRITICAL CONSTRAINTS:
- ALL dates MUST be between ${formattedStartDate} and ${formattedEndDate}
- MUST return AT LEAST 4 separate phases
- Phase names MUST be specific work stages
- NO generic names like "Project", "Work", "Phase 1"
- Phases should flow logically in sequence
- Output ONLY the JSON object with multiple phases

REMEMBER: A ${totalWeeks}-week project needs 4-6 distinct phases for proper planning!
`;

  // 🟦 STEP 5 — Call Groq API
  try {
    console.log("🧠 Calling Groq API for Master Plan generation...");
    
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", // Updated to newer model
          messages: [
            {
              role: "system",
              content: "You are a strict JSON generator for project planning. Always output valid JSON only. No markdown, no code blocks, no explanations.",
            },
            { role: "user", content: basePrompt },
          ],
          temperature: 0.3, // Lower temperature for consistent results
          max_tokens: 2000,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Groq API Error Response:", errorData);
      console.error("❌ Status Code:", response.status);
      console.error("❌ Request Details:");
      console.error("   - Model: llama-3.3-70b-versatile");
      console.error("   - Prompt Length:", basePrompt.length, "chars");
      console.error("   - API Key Present:", !!process.env.GROQ_API_KEY);
      throw new Error(`Groq API returned ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    const rawOutput = data?.choices?.[0]?.message?.content || "";

    console.log("🤖 Raw AI Output:", rawOutput.substring(0, 200) + "...");

    // 🟦 STEP 6 — Parse JSON safely
    let masterPlan = {};
    try {
      // Remove markdown code blocks if present
      const cleanedOutput = rawOutput
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      
      const match = cleanedOutput.match(/\{[\s\S]*\}/);
      if (match) {
        masterPlan = JSON.parse(match[0]);
        console.log("✅ Successfully parsed AI-generated master plan");
      }
    } catch (err) {
      console.error("⚠️ JSON parse error:", err);
    }

    // 🟦 STEP 7 — Validate quality of phases
    const phaseNames = Object.keys(masterPlan);
    const invalidNames = ['project', 'phase', 'work', 'task', 'milestone', 'phase 1', 'phase 2', 'phase 3'];
    
    // Filter out invalid/generic phase names
    const validPhases = phaseNames.filter(name => {
      const lowerName = name.toLowerCase();
      return !invalidNames.some(invalid => lowerName === invalid || lowerName.startsWith(invalid + ' '));
    });

    // Check if we have enough valid phases
    const hasEnoughPhases = validPhases.length >= 4;
    
    if (!hasEnoughPhases) {
      console.warn(`⚠️ AI output has only ${validPhases.length} valid phases (need 4+), using intelligent fallback...`);
      masterPlan = {}; // Reset to trigger fallback
    } else {
      // Keep only valid phases
      const filteredMasterPlan = {};
      validPhases.forEach(name => {
        filteredMasterPlan[name] = masterPlan[name];
      });
      masterPlan = filteredMasterPlan;
      console.log(`✅ ${validPhases.length} valid phases generated`);
    }

    // 🟦 STEP 8 — Intelligent Fallback (if needed)
    // 🟦 STEP 8 — Intelligent Fallback (if needed)
    const hasValidPhases = masterPlan && Object.keys(masterPlan).length >= 4;

    if (!hasValidPhases) {
      console.warn("⚠️ Using intelligent fallback to generate phases...");
      
      // Strategy 1: Use phases from actuals data
      let fallbackPhases = [];
      if (actualsData.length > 0) {
        // Extract unique phases from actuals, in order of frequency
        const phaseFrequency = {};
        actualsData.forEach(a => {
          phaseFrequency[a.Category] = (phaseFrequency[a.Category] || 0) + 1;
        });
        
        fallbackPhases = Object.entries(phaseFrequency)
          .sort((a, b) => b[1] - a[1])
          .map(([phase]) => phase)
          .slice(0, 6); // Top 6 most common phases
        
        console.log("📊 Using phases from historical data:", fallbackPhases);
      }
      
      // Strategy 2: If not enough phases from actuals, add standard ones
      if (fallbackPhases.length < 4) {
        const standardPhases = [
          "Requirements & Planning",
          "System Development", 
          "Integration & Testing",
          "User Acceptance Testing",
          "Deployment & Go-Live"
        ];
        
        // Merge with actuals, removing duplicates
        fallbackPhases = [...new Set([...fallbackPhases, ...standardPhases])].slice(0, 6);
        console.log("📋 Enhanced with standard phases:", fallbackPhases);
      }
      
      // Ensure we have exactly 4-6 phases for the timeline
      const idealPhaseCount = totalWeeks < 12 ? 4 : totalWeeks < 20 ? 5 : 6;
      fallbackPhases = fallbackPhases.slice(0, idealPhaseCount);
      
      // Calculate phase durations dynamically
      const phaseDuration = Math.floor(totalDays / fallbackPhases.length);
      
      let currentDate = new Date(projectStartDate);
      masterPlan = {};

      fallbackPhases.forEach((phase, index) => {
        const phaseStart = new Date(currentDate);
        
        // Allocate more time to development phases (if found)
        const isDevelopment = phase.toLowerCase().includes('develop') || 
                            phase.toLowerCase().includes('build');
        const phaseLength = isDevelopment 
          ? Math.floor(phaseDuration * 1.5) 
          : phaseDuration;
        
        currentDate.setDate(currentDate.getDate() + phaseLength);
        const phaseEnd = new Date(currentDate);

        // Ensure last phase ends exactly on project end date
        if (index === fallbackPhases.length - 1) {
          phaseEnd.setTime(projectEndDate.getTime());
        }

        // Ensure we don't exceed project end date
        if (phaseEnd > projectEndDate) {
          phaseEnd.setTime(projectEndDate.getTime());
        }

        // Format as YYYY-MM-DD
        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        masterPlan[phase] = {
          startDate: formatDate(phaseStart),
          endDate: formatDate(phaseEnd),
          status: "Planned"
        };
      });
      
      console.log(`✅ Fallback generated ${fallbackPhases.length} phases`);
    }

    // 🟦 STEP 9 — Return response
    console.log("✅ Master Plan generated successfully");
    
    res.json({
      success: true,
      source: hasValidPhases ? "ai" : "fallback",
      department: department,
      masterPlan: masterPlan,
      historicalContext: {
        projectsAnalyzed: actualsData.length > 0 ? Object.keys(
          actualsData.reduce((acc, row) => {
            acc[row.Project || row.Category] = true;
            return acc;
          }, {})
        ).length : 0,
        totalRecords: actualsData.length,
        hasUserQuery: !!userQuery,
        webSearchUsed: searchOnline && webSearchContext.length > 0
      }
    });

  } catch (err) {
    console.error("💥 Groq API error:", err);
    res.status(500).json({ 
      error: "Failed to generate AI master plan",
      details: err.message 
    });
  }
};