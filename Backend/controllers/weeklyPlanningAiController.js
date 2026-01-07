const { sql, getPool } = require("../db/pool");
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * Generate AI recommendations for weekly time allocation across ALL active projects
 */
exports.generateWeeklyRecommendations = async (req, res) => {
  const { weekStart, weekEnd, userGoals } = req.body;
  const userId = req.user.id;

  console.log("🤖 Weekly AI Recommendation Request:", {
    userId,
    weekStart,
    weekEnd,
    hasUserGoals: !!userGoals
  });

  if (!weekStart || !weekEnd) {
    return res.status(400).json({ 
      message: "Missing required fields: weekStart, weekEnd" 
    });
  }

  // Validate it's a Monday-Friday week
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  
  if (start.getDay() !== 1 || end.getDay() !== 5) {
    return res.status(400).json({ 
      message: "Week must start on Monday and end on Friday" 
    });
  }

  try {
    const pool = await getPool();

    // ========================================
    // 1. GET ALL ACTIVE PROJECT ASSIGNMENTS
    // ========================================
    const plansRequest = pool.request();
    plansRequest.input("UserId", sql.Int, userId);
    plansRequest.input("WeekStart", sql.Date, weekStart);
    
    const plansResult = await plansRequest.query(`
      SELECT 
        ip.Id,
        ip.Project,
        ip.ProjectType,
        ip.StartDate,
        ip.EndDate,
        ip.Fields
      FROM IndividualPlan ip
      WHERE ip.UserId = @UserId
        AND ip.EndDate >= @WeekStart  -- Only active projects
      ORDER BY ip.ProjectType, ip.Project
    `);

    const activeProjects = plansResult.recordset.map(plan => ({
      id: plan.Id,
      project: plan.Project,
      projectType: plan.ProjectType,
      startDate: plan.StartDate,
      endDate: plan.EndDate,
      fields: JSON.parse(plan.Fields || '{}')
    }));

    console.log(`📋 Active Projects: ${activeProjects.length}`);

    if (activeProjects.length === 0) {
      return res.status(400).json({ 
        message: "No active project assignments found. Please create project assignments first." 
      });
    }

    // ========================================
    // 2. GET MASTER PLAN CONTEXT FOR EACH PROJECT
    // ========================================
    const masterPlansContext = [];
    
    for (const project of activeProjects) {
      if (project.projectType === 'master-plan') {
        const mpRequest = pool.request();
        mpRequest.input("ProjectName", sql.NVarChar, project.project);
        mpRequest.input("WeekStart", sql.Date, weekStart);
        mpRequest.input("WeekEnd", sql.Date, weekEnd);
        
        const mpResult = await mpRequest.query(`
          SELECT mp.Id, mp.Project, mp.StartDate, mp.EndDate,
                 f.FieldName, f.FieldValue, f.StartDate as FieldStartDate, f.EndDate as FieldEndDate
          FROM MasterPlan mp
          LEFT JOIN MasterPlanFields f ON mp.Id = f.MasterPlanId
          WHERE mp.Project = @ProjectName
            AND (
              -- Milestone overlaps with target week
              (f.StartDate <= @WeekEnd AND f.EndDate >= @WeekStart)
              OR (f.StartDate IS NULL)  -- Include if no dates
            )
        `);

        if (mpResult.recordset.length > 0) {
          const masterPlan = {
            project: mpResult.recordset[0].Project,
            milestones: []
          };

          mpResult.recordset.forEach(row => {
            if (row.FieldName) {
              masterPlan.milestones.push({
                name: row.FieldName,
                status: row.FieldValue,
                startDate: row.FieldStartDate,
                endDate: row.FieldEndDate
              });
            }
          });

          if (masterPlan.milestones.length > 0) {
            masterPlansContext.push(masterPlan);
          }
        }
      }
    }

    console.log(`🎯 Master Plans with overlapping milestones: ${masterPlansContext.length}`);

    // ========================================
    // 3. FETCH HISTORICAL ACTUALS
    // ========================================
    const actualsRequest = pool.request();
    actualsRequest.input("UserId", sql.Int, userId);
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    actualsRequest.input("HistoricalStartDate", sql.Date, sixMonthsAgo);

    const actualsResult = await actualsRequest.query(`
      SELECT Category, Project, StartDate, EndDate, Hours
      FROM Actuals 
      WHERE UserId = @UserId
        AND StartDate >= @HistoricalStartDate
      ORDER BY StartDate DESC
    `);

    const actuals = actualsResult.recordset;
    
    // Calculate patterns
    const totalHours = actuals.reduce((sum, e) => sum + e.Hours, 0);
    const avgHoursPerWeek = actuals.length > 0 
      ? Math.min(42.5, totalHours / Math.max(1, Math.ceil(actuals.length / 5)))
      : 42.5;

    const categoryDist = {};
    actuals.forEach(e => {
      categoryDist[e.Category] = (categoryDist[e.Category] || 0) + e.Hours;
    });

    const topCategories = Object.entries(categoryDist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, hrs]) => ({ category: cat, hours: hrs.toFixed(1) }));

    console.log(`📈 Avg Hours/Week: ${avgHoursPerWeek.toFixed(1)}h`);

    // ========================================
    // 4. CHECK EXISTING ALLOCATIONS FOR THIS WEEK
    // ========================================
    const existingRequest = pool.request();
    existingRequest.input("UserId", sql.Int, userId);
    existingRequest.input("WeekStart", sql.Date, weekStart);

    const existingResult = await existingRequest.query(`
      SELECT ProjectName, PlannedHours
      FROM WeeklyAllocation
      WHERE UserId = @UserId AND WeekStart = @WeekStart
    `);

    const existingAllocations = existingResult.recordset;
    const alreadyAllocatedHours = existingAllocations.reduce((sum, a) => sum + parseFloat(a.PlannedHours), 0);

    console.log(`⏰ Already Allocated: ${alreadyAllocatedHours}h / ${avgHoursPerWeek.toFixed(1)}h`);

    // ========================================
    // 5. GET USER PROFILE
    // ========================================
    const userRequest = pool.request();
    userRequest.input("UserId", sql.Int, userId);
    
    const userResult = await userRequest.query(`
      SELECT FirstName, LastName, Role, Department
      FROM Users WHERE Id = @UserId
    `);

    const userProfile = userResult.recordset[0] || {};

    // ========================================
    // 6. BUILD AI PROMPT
    // ========================================
    const availableHours = Math.max(0, avgHoursPerWeek - alreadyAllocatedHours);

    let projectsSection = activeProjects.map(p => 
      `- ${p.project} (${p.projectType}): ${new Date(p.startDate).toLocaleDateString()} - ${new Date(p.endDate).toLocaleDateString()}`
    ).join('\n');

    let masterPlansSection = '';
    if (masterPlansContext.length > 0) {
      masterPlansSection = `
**MASTER PLAN CONTEXT (Milestones overlapping this week):**
${masterPlansContext.map(mp => `
Project: ${mp.project}
Active Milestones this week:
${mp.milestones.map(m => `  • ${m.name}: ${new Date(m.startDate).toLocaleDateString()} - ${new Date(m.endDate).toLocaleDateString()} (${m.status})`).join('\n')}
`).join('\n')}`;
    }

    let existingAllocationsSection = '';
    if (existingAllocations.length > 0) {
      existingAllocationsSection = `
**ALREADY ALLOCATED THIS WEEK:**
${existingAllocations.map(a => `- ${a.ProjectName}: ${a.PlannedHours}h`).join('\n')}
`;
    }

    const aiPrompt = `You are an expert project management AI. Help the user plan their upcoming work week across multiple projects.

**USER PROFILE:**
- Name: ${userProfile.FirstName} ${userProfile.LastName}
- Role: ${userProfile.Role}
- Department: ${userProfile.Department}

**WORK WEEK:**
- Week: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}
- Available Work Hours: 42.5 hours (5 days × 8.5 hours)
- User's Average Capacity: ${avgHoursPerWeek.toFixed(1)} hours/week

**ACTIVE PROJECT ASSIGNMENTS:**
${projectsSection}

${masterPlansSection}
${existingAllocationsSection}

**HISTORICAL WORK PATTERNS:**
- Top Categories: ${topCategories.map(c => `${c.category} (${c.hours}h)`).join(', ')}
- Data Points: ${actuals.length} entries

${userGoals ? `**USER'S GOALS FOR THIS WEEK:**\n${userGoals}\n` : ''}

**TASK:**
Generate a balanced weekly time allocation plan that:
1. Allocates **EXACTLY ${availableHours.toFixed(1)} hours** (remaining capacity)
2. Distributes time across ALL ${activeProjects.length} active projects
3. Prioritizes projects with upcoming master plan milestones
4. Considers their historical work patterns
${userGoals ? '5. Aligns with their stated goals\n' : ''}

**ALLOCATION RULES:**
- Each project should get at least 5-10 hours if it's a priority
- Operations typically need 10-15 hours/week for steady workload
- Projects nearing milestones need more hours
- Leave 2-3 hours buffer for meetings/admin

Respond in this EXACT JSON format:
{
  "reasoning": "Brief analysis (2-3 sentences)",
  "weeklyAllocations": [
    {
      "projectName": "Project Name",
      "projectType": "master-plan",
      "individualPlanId": ${activeProjects[0]?.id || 'null'},
      "allocatedHours": 15.0,
      "tasks": [
        {"name": "Task description", "hours": 8.0},
        {"name": "Another task", "hours": 7.0}
      ],
      "rationale": "Why this allocation makes sense"
    }
  ],
  "totalHours": ${availableHours.toFixed(1)},
  "bufferHours": 2.5
}`;

    console.log("🤖 Sending prompt to Groq AI...");

    // ========================================
    // 7. CALL GROQ AI
    // ========================================
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a project management AI that helps users plan their weekly time allocation across multiple projects. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: aiPrompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 2000
    });

    const aiResponse = completion.choices[0]?.message?.content || "{}";

    // ========================================
    // 8. PARSE RESPONSE
    // ========================================
    let recommendations;
    try {
      const cleanedResponse = aiResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      recommendations = JSON.parse(cleanedResponse);

      if (!Array.isArray(recommendations.weeklyAllocations)) {
        throw new Error("Invalid AI response structure");
      }

      console.log(`✅ Generated ${recommendations.weeklyAllocations.length} weekly allocations`);

    } catch (parseError) {
      console.error("❌ Failed to parse AI response:", parseError);
      return res.status(500).json({ 
        message: "AI generated invalid response",
        error: parseError.message 
      });
    }

    // ========================================
    // 9. RETURN RECOMMENDATIONS
    // ========================================
    res.status(200).json({
      success: true,
      weekStart,
      weekEnd,
      activeProjectsCount: activeProjects.length,
      availableHours,
      alreadyAllocatedHours,
      recommendations: recommendations.weeklyAllocations,
      reasoning: recommendations.reasoning,
      totalHours: recommendations.totalHours,
      bufferHours: recommendations.bufferHours || 0
    });

  } catch (err) {
    console.error("❌ Generate Weekly Recommendations Error:", err);
    res.status(500).json({ 
      message: "Failed to generate weekly recommendations",
      error: err.message 
    });
  }
};