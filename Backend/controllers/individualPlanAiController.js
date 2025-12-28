const { sql, getPool } = require("../db/pool");const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * Analyze user's historical actuals data and generate AI recommendations
 * for individual plan milestones based on the selected master plan
 */
exports.generateRecommendations = async (req, res) => {
  const { projectName, projectType, masterPlanId, startDate, endDate, userQuery } = req.body;
  const userId = req.user.id;

  console.log("🤖 AI Recommendation Request:", {
    userId,
    projectName,
    projectType,
    masterPlanId,
    startDate,
    endDate,
    hasUserQuery: !!userQuery
  });

  if (!projectName || !startDate || !endDate) {
    return res.status(400).json({ 
      message: "Missing required fields: projectName, startDate, endDate" 
    });
  }

  try {
    const pool = await getPool();

    // ========================================
    // 1. Fetch Master Plan Details (if applicable)
    // ========================================
    let masterPlan = null;
    
    if (projectType === 'master-plan' && masterPlanId) {
      const masterPlanRequest = pool.request();
      masterPlanRequest.input("MasterPlanId", sql.Int, masterPlanId);
      
      const masterPlanResult = await masterPlanRequest.query(`
        SELECT mp.Id, mp.Project, mp.StartDate, mp.EndDate,
               f.FieldName, f.FieldValue, f.StartDate as FieldStartDate, f.EndDate as FieldEndDate
        FROM MasterPlan mp
        LEFT JOIN MasterPlanFields f ON mp.Id = f.MasterPlanId
        WHERE mp.Id = @MasterPlanId
      `);

      if (masterPlanResult.recordset.length > 0) {
        masterPlan = {
          id: masterPlanResult.recordset[0].Id,
          project: masterPlanResult.recordset[0].Project,
          startDate: masterPlanResult.recordset[0].StartDate,
          endDate: masterPlanResult.recordset[0].EndDate,
          milestones: []
        };

        masterPlanResult.recordset.forEach(row => {
          if (row.FieldName) {
            masterPlan.milestones.push({
              name: row.FieldName,
              status: row.FieldValue,
              startDate: row.FieldStartDate,
              endDate: row.FieldEndDate
            });
          }
        });

        console.log("📋 Master Plan Retrieved:", masterPlan.project);
      }
    }

    // ========================================
    // 2. Fetch User's Historical Actuals Data
    // ========================================
    const actualsRequest = pool.request();
    actualsRequest.input("UserId", sql.Int, userId);
    
    // Get actuals from the past 6 months to analyze patterns
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    actualsRequest.input("HistoricalStartDate", sql.Date, sixMonthsAgo);

    const actualsResult = await actualsRequest.query(`
      SELECT 
        Category,
        Project,
        StartDate,
        EndDate,
        Hours,
        CreatedAt
      FROM Actuals 
      WHERE UserId = @UserId
        AND StartDate >= @HistoricalStartDate
      ORDER BY StartDate DESC
    `);

    console.log(`📊 Historical Actuals Retrieved: ${actualsResult.recordset.length} entries`);

    // ========================================
    // 3. Calculate User Work Patterns
    // ========================================
    const actuals = actualsResult.recordset;
    
    // Calculate average hours per week
    const totalHours = actuals.reduce((sum, entry) => sum + entry.Hours, 0);
    const earliestDate = actuals.length
      ? new Date(actuals[actuals.length - 1].StartDate)
      : new Date(startDate);

    const latestDate = actuals.length
      ? new Date(actuals[0].StartDate)
      : new Date(endDate);

    const weeksCovered = Math.max(
      1,
      Math.ceil((latestDate - earliestDate) / (1000 * 60 * 60 * 24 * 7))
    );

    const avgHoursPerWeek = totalHours / weeksCovered;

    // Calculate project distribution
    const projectDistribution = {};
    actuals.forEach(entry => {
      if (entry.Category !== 'Admin/Others') {
        const project = entry.Project || 'Other';
        projectDistribution[project] = (projectDistribution[project] || 0) + entry.Hours;
      }
    });

    // Calculate category distribution
    const categoryDistribution = {};
    actuals.forEach(entry => {
      categoryDistribution[entry.Category] = (categoryDistribution[entry.Category] || 0) + entry.Hours;
    });

    // Sort to find most worked-on projects and categories
    const topProjects = Object.entries(projectDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([project, hours]) => ({ project, hours: hours.toFixed(1) }));

    const topCategories = Object.entries(categoryDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, hours]) => ({ category, hours: hours.toFixed(1) }));

    console.log("📈 User Work Patterns:", {
      avgHoursPerWeek: avgHoursPerWeek.toFixed(1),
      topProjects,
      topCategories
    });

    // ========================================
    // 4. Get User Profile Information
    // ========================================
    const userRequest = pool.request();
    userRequest.input("UserId", sql.Int, userId);
    
    const userResult = await userRequest.query(`
      SELECT FirstName, LastName, Role, Department, Project, Team
      FROM Users
      WHERE Id = @UserId
    `);

    const userProfile = userResult.recordset[0] || {};
    console.log("👤 User Profile:", `${userProfile.FirstName} ${userProfile.LastName} - ${userProfile.Role}`);

    // ========================================
    // 5. Calculate Individual Plan Timeline
    // ========================================
    const planStartDate = new Date(startDate);
    const planEndDate = new Date(endDate);
    const planDurationDays = Math.ceil((planEndDate - planStartDate) / (1000 * 60 * 60 * 24));
    const planDurationWeeks = Math.ceil(planDurationDays / 7);

    const planStartISO = planStartDate.toISOString().split('T')[0];
    const planEndISO = planEndDate.toISOString().split('T')[0];

    console.log(`📅 Individual Plan Duration: ${planDurationDays} days (${planDurationWeeks} weeks)`);

    // ========================================
    // 6. Build AI Prompt with Real Data
    // ========================================
    let contextSection = '';
    
    if (masterPlan) {
      contextSection = `
**MASTER PLAN CONTEXT:**
- Project: ${masterPlan.project}
- Master Plan Timeline: ${new Date(masterPlan.startDate).toLocaleDateString()} - ${new Date(masterPlan.endDate).toLocaleDateString()}
- Master Plan Milestones:
${masterPlan.milestones.map(m => `  • ${m.name}: ${new Date(m.startDate).toLocaleDateString()} - ${new Date(m.endDate).toLocaleDateString()} (${m.status})`).join('\n')}
`;
    } else {
      contextSection = `
**PROJECT CONTEXT:**
- Project Type: ${projectType === 'operation' ? 'Operations' : 'Custom Project'}
- Project Name: ${projectName}
`;
    }

    let userQuerySection = '';
    if (userQuery) {
      userQuerySection = `
**USER'S SPECIFIC REQUIREMENTS:**
${userQuery}
`;
    }

    const aiPrompt = `You are an expert project management AI assistant. Generate personalized individual plan recommendations based on real historical work data${masterPlan ? ' and master plan context' : ''}.

**USER PROFILE:**
- Name: ${userProfile.FirstName} ${userProfile.LastName}
- Role: ${userProfile.Role}
- Department: ${userProfile.Department}
- Team: ${userProfile.Team}
- Current Project: ${userProfile.Project}

**HISTORICAL WORK PATTERNS (Past 6 Months):**
- Average Hours per Week: ${avgHoursPerWeek.toFixed(1)} hours
- Total Entries Logged: ${actuals.length}
- Top Project Categories: ${topCategories.map(c => `${c.category} (${c.hours}h)`).join(', ')}
- Top Projects Worked On: ${topProjects.map(p => `${p.project} (${p.hours}h)`).join(', ')}

${contextSection}
${userQuerySection}

**INDIVIDUAL PLAN REQUEST:**
- Timeline: ${planStartDate.toLocaleDateString()} - ${planEndDate.toLocaleDateString()}
- Duration: ${planDurationDays} days (${planDurationWeeks} weeks)
- Project: ${projectName}

**TASK:**
Based on the user's historical work patterns${masterPlan ? ', the master plan milestones,' : ''}${userQuery ? ' and their specific requirements,' : ''} generate 6-8 realistic, actionable milestones for their individual plan. Consider:

1. Their typical weekly capacity (${avgHoursPerWeek.toFixed(1)} hours/week)
2. Their work distribution patterns across categories
3. The individual timeline (${planDurationWeeks} weeks)
${masterPlan ? '4. How their individual timeline fits within the master plan phases\n' : ''}${userQuery ? `${masterPlan ? '5' : '4'}. Their specific requirements and goals\n` : ''}

**CRITICAL REQUIREMENTS:**
- Milestones MUST be consecutive with NO GAPS between them
- The FIRST milestone MUST start on ${planStartISO} (the plan start date)
- The LAST milestone MUST end on ${planEndISO} (the plan end date)
- Each milestone's end date MUST be immediately followed by the next milestone's start date (or they can share the same date)
- Cover the ENTIRE timeline from start to end with no missing days
- Distribute milestones logically based on their historical work patterns

Provide your response in this EXACT JSON format (no markdown, no extra text):
{
  "reasoning": "Brief analysis of why these recommendations fit the user's work patterns${masterPlan ? ' and master plan context' : ''}${userQuery ? ' and requirements' : ''} (2-3 sentences)",
  "suggestedMilestones": [
    {
      "name": "Milestone name",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "estimatedHours": 24,
      "rationale": "Why this milestone timing makes sense based on their data"
    }
  ]
}`;

    console.log("🤖 Sending prompt to Groq AI...");

    // ========================================
    // 7. Call Groq AI API
    // ========================================
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a project management AI that analyzes historical work data to provide personalized recommendations. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: aiPrompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 1,
      stream: false
    });

    const aiResponse = completion.choices[0]?.message?.content || "{}";
    console.log("✅ AI Response received");

    // ========================================
    // 8. Parse and Validate AI Response
    // ========================================
    let recommendations;
    try {
      // Clean up response (remove markdown if present)
      const cleanedResponse = aiResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      recommendations = JSON.parse(cleanedResponse);
      
      // Validate structure
      if (!recommendations.reasoning || !Array.isArray(recommendations.suggestedMilestones)) {
        throw new Error("Invalid AI response structure");
      }

      console.log(`🎯 Generated ${recommendations.suggestedMilestones.length} milestone recommendations`);

    } catch (parseError) {
      console.error("❌ Failed to parse AI response:", parseError);
      return res.status(500).json({ 
        message: "AI generated invalid response",
        error: parseError.message 
      });
    }

    // ========================================
    // 9. Return Recommendations
    // ========================================
    res.status(200).json({
      success: true,
      projectType: projectType,
      projectName: projectName,
      masterPlan: masterPlan ? {
        project: masterPlan.project,
        startDate: masterPlan.startDate,
        endDate: masterPlan.endDate
      } : null,
      userWorkPatterns: {
        avgHoursPerWeek: parseFloat(avgHoursPerWeek.toFixed(1)),
        topProjects,
        topCategories,
        totalEntriesAnalyzed: actuals.length
      },
      recommendations: recommendations.suggestedMilestones,
      reasoning: recommendations.reasoning
    });

  } catch (err) {
    console.error("❌ Generate Recommendations Error:", err);
    res.status(500).json({ 
      message: "Failed to generate recommendations",
      error: err.message 
    });
  }
};