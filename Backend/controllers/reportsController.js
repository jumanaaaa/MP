const { sql, getPool } = require("../db/pool");const Holidays = require('date-holidays');

// Initialize Singapore holidays
const hd = new Holidays('SG');

/**
 * Calculate working days between two dates (excluding weekends and Singapore holidays)
 */
const calculateWorkingDays = (startDate, endDate) => {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = hd.isHoliday(current);

    if (!isWeekend && !isHoliday) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
};

/**
 * Calculate months between two dates
 */
const calculateMonthsBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  const totalMonths = yearDiff * 12 + monthDiff;
  
  // If less than a month, return 1
  return totalMonths < 1 ? 1 : totalMonths + 1;
};

/**
 * Calculate overlap between two date ranges
 */
const calculateOverlapMonths = (planStart, planEnd, filterStart, filterEnd) => {
  const overlapStart = planStart > filterStart ? planStart : filterStart;
  const overlapEnd = planEnd < filterEnd ? planEnd : filterEnd;
  
  if (overlapStart > overlapEnd) return 0;
  
  return calculateMonthsBetween(overlapStart, overlapEnd);
};

/**
 * Get comprehensive reports for a user
 */
exports.getUserReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fromDate, toDate, projectFilter } = req.query;

    console.log(`📊 Fetching reports for user ${userId}`);
    console.log(`📅 Date range: ${fromDate} to ${toDate}`);
    console.log(`🔍 Project filter: ${projectFilter || 'All Projects'}`);

    const pool = await getPool();

    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);

    // ========================================
    // 1. FETCH INDIVIDUAL PLANS
    // ========================================
    let individualPlansQuery = `
      SELECT 
        Id,
        Project,
        Role,
        StartDate,
        EndDate,
        Fields
      FROM IndividualPlan
      WHERE UserId = @userId
        AND (
          (StartDate <= @endDate AND EndDate >= @startDate)
        )
    `;

    if (projectFilter && projectFilter !== 'All Projects') {
      individualPlansQuery += ` AND Project = @projectFilter`;
    }

    const individualPlansRequest = pool.request();
    individualPlansRequest.input('userId', sql.Int, userId);
    individualPlansRequest.input('startDate', sql.Date, startDate);
    individualPlansRequest.input('endDate', sql.Date, endDate);
    if (projectFilter && projectFilter !== 'All Projects') {
      individualPlansRequest.input('projectFilter', sql.NVarChar, projectFilter);
    }

    const individualPlansResult = await individualPlansRequest.query(individualPlansQuery);
    const individualPlans = individualPlansResult.recordset;

    console.log(`📋 Found ${individualPlans.length} individual plans`);

    // Calculate total planned hours from individual plans
    let totalPlannedHours = 0;
    const plannedHoursByMonth = {};

    individualPlans.forEach(plan => {
      const planStart = new Date(plan.StartDate);
      const planEnd = new Date(plan.EndDate);
      
      // Calculate total months in the plan
      const totalMonthsInPlan = calculateMonthsBetween(planStart, planEnd);
      
      // Calculate overlap with filter range
      const overlapMonths = calculateOverlapMonths(planStart, planEnd, startDate, endDate);
      
      // Parse fields to get total hours from milestones
      const fields = JSON.parse(plan.Fields || '{}');
      let planTotalHours = 0;
      
      Object.entries(fields).forEach(([key, value]) => {
        if (key !== 'title' && key !== 'status' && value && typeof value === 'object') {
          if (value.hours) {
            planTotalHours += parseFloat(value.hours || 0);
          }
        }
      });

      // If no hours in milestones, estimate based on working days
      if (planTotalHours === 0) {
        const workingDays = calculateWorkingDays(planStart, planEnd);
        planTotalHours = workingDays * 8; // 8 hours per working day
      }

      // Calculate hours per month
      const hoursPerMonth = planTotalHours / totalMonthsInPlan;
      
      // Add to total based on overlap
      const plannedForPeriod = hoursPerMonth * overlapMonths;
      totalPlannedHours += plannedForPeriod;

      // Group by month for chart
      let currentMonth = new Date(Math.max(planStart, startDate));
      const periodEnd = new Date(Math.min(planEnd, endDate));

      while (currentMonth <= periodEnd) {
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        if (!plannedHoursByMonth[monthKey]) {
          plannedHoursByMonth[monthKey] = 0;
        }
        plannedHoursByMonth[monthKey] += hoursPerMonth;
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
    });

    // ========================================
    // 2. FETCH ACTUALS DATA
    // ========================================
    let actualsQuery = `
      SELECT 
        Category,
        Project,
        Hours,
        StartDate,
        EndDate
      FROM Actuals
      WHERE UserId = @userId
        AND StartDate >= @startDate
        AND EndDate <= @endDate
    `;

    if (projectFilter && projectFilter !== 'All Projects') {
      actualsQuery += ` AND Project = @projectFilter`;
    }

    const actualsRequest = pool.request();
    actualsRequest.input('userId', sql.Int, userId);
    actualsRequest.input('startDate', sql.Date, startDate);
    actualsRequest.input('endDate', sql.Date, endDate);
    if (projectFilter && projectFilter !== 'All Projects') {
      actualsRequest.input('projectFilter', sql.NVarChar, projectFilter);
    }

    const actualsResult = await actualsRequest.query(actualsQuery);
    const actuals = actualsResult.recordset;

    console.log(`📋 Found ${actuals.length} actual entries`);

    // Calculate actuals totals (excluding Admin/Others for capacity calculation)
    const actualsTotal = actuals
      .filter(a => a.Category !== 'Admin/Others')
      .reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0);

    // Group actuals by month for chart
    const actualsByMonth = {};
    actuals.forEach(actual => {
      if (actual.Category === 'Admin/Others') return; // Exclude leave
      
      const actualDate = new Date(actual.StartDate);
      const monthKey = `${actualDate.getFullYear()}-${String(actualDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!actualsByMonth[monthKey]) {
        actualsByMonth[monthKey] = 0;
      }
      actualsByMonth[monthKey] += parseFloat(actual.Hours || 0);
    });

    // ========================================
    // 3. FETCH MASTER PLANS & CALCULATE PROJECT PERFORMANCE
    // ========================================
    let masterPlansQuery = `
      SELECT 
        mp.Id,
        mp.Project,
        mp.ProjectType,
        mp.StartDate,
        mp.EndDate
      FROM MasterPlan mp
      INNER JOIN MasterPlanPermissions perm ON mp.Id = perm.MasterPlanId
      WHERE perm.UserId = @userId
        AND (
          (mp.StartDate <= @endDate AND mp.EndDate >= @startDate)
        )
    `;

    if (projectFilter && projectFilter !== 'All Projects') {
      masterPlansQuery += ` AND mp.Project = @projectFilter`;
    }

    const masterPlansRequest = pool.request();
    masterPlansRequest.input('userId', sql.Int, userId);
    masterPlansRequest.input('startDate', sql.Date, startDate);
    masterPlansRequest.input('endDate', sql.Date, endDate);
    if (projectFilter && projectFilter !== 'All Projects') {
      masterPlansRequest.input('projectFilter', sql.NVarChar, projectFilter);
    }

    const masterPlansResult = await masterPlansRequest.query(masterPlansQuery);
    const masterPlans = masterPlansResult.recordset;

    console.log(`📋 Found ${masterPlans.length} master plans`);

    // Calculate project performance
    const projectPerformance = [];

    for (const plan of masterPlans) {
      const planStart = new Date(plan.StartDate);
      const planEnd = new Date(plan.EndDate);
      
      // Calculate working days for this plan (excluding weekends and holidays)
      const workingDays = calculateWorkingDays(planStart, planEnd);
      const plannedHours = workingDays * 8; // 8 hours per working day

      // Get actuals for this specific project
      const projectActuals = actuals.filter(a => 
        a.Project === plan.Project && 
        a.Category !== 'Admin/Others'
      );
      
      const spentHours = projectActuals.reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0);
      
      // Calculate efficiency
      const efficiency = plannedHours > 0 
        ? ((spentHours / plannedHours) * 100).toFixed(1)
        : 0;

      projectPerformance.push({
        project: plan.Project,
        activityType: plan.ProjectType || 'General',
        plannedHours: parseFloat(plannedHours.toFixed(2)),
        spentHours: parseFloat(spentHours.toFixed(2)),
        efficiency: parseFloat(efficiency)
      });
    }

    // ========================================
    // 4. CALCULATE CAPACITY UTILIZATION BY MONTH
    // ========================================
    const allMonths = new Set([
      ...Object.keys(plannedHoursByMonth),
      ...Object.keys(actualsByMonth)
    ]);

    const capacityByMonth = Array.from(allMonths).sort().map(monthKey => {
      const [year, month] = monthKey.split('-');
      const monthName = new Date(year, parseInt(month) - 1).toLocaleString('en-US', { month: 'short' });
      
      const planned = plannedHoursByMonth[monthKey] || 0;
      const actual = actualsByMonth[monthKey] || 0;
      const efficiency = planned > 0 ? ((actual / planned) * 100).toFixed(1) : 0;

      return {
        month: monthName,
        year: year,
        planned: parseFloat(planned.toFixed(2)),
        actual: parseFloat(actual.toFixed(2)),
        efficiency: parseFloat(efficiency)
      };
    });

    // ========================================
    // 5. CALCULATE SUMMARY METRICS
    // ========================================
    const difference = actualsTotal - totalPlannedHours;
    const accuracy = totalPlannedHours > 0
      ? Math.min(100, ((actualsTotal / totalPlannedHours) * 100)).toFixed(1)
      : 0;

    // ========================================
    // 6. GET AVAILABLE PROJECTS FOR FILTER
    // ========================================
    const projectsRequest = pool.request();
    projectsRequest.input('userId', sql.Int, userId);

    const projectsResult = await projectsRequest.query(`
      SELECT DISTINCT Project FROM (
        SELECT Project FROM IndividualPlan WHERE UserId = @userId
        UNION
        SELECT mp.Project 
        FROM MasterPlan mp
        INNER JOIN MasterPlanPermissions perm ON mp.Id = perm.MasterPlanId
        WHERE perm.UserId = @userId
      ) AS AllProjects
      ORDER BY Project
    `);

    const availableProjects = projectsResult.recordset.map(p => p.Project);

    // ========================================
    // 7. RETURN COMPREHENSIVE REPORT
    // ========================================
    const report = {
      success: true,
      dateRange: {
        from: fromDate,
        to: toDate,
        days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
      },
      summary: {
        accuracy: parseFloat(accuracy),
        difference: parseFloat(difference.toFixed(2)),
        status: Math.abs(difference) < 5 ? 'On Track' : 
                difference > 0 ? 'Ahead' : 'Behind'
      },
      actuals: {
        total: parseFloat(actualsTotal.toFixed(2))
      },
      individualPlans: {
        total: parseFloat(totalPlannedHours.toFixed(2))
      },
      manicTime: {
        total: parseFloat(actualsTotal.toFixed(2)) // Using actuals as proxy for now
      },
      capacityByMonth: capacityByMonth,
      projectPerformance: projectPerformance,
      availableProjects: ['All Projects', ...availableProjects],
      dailyBreakdown: [] // Can be populated if needed
    };

    console.log(`📊 Report generated successfully`);
    res.status(200).json(report);

  } catch (error) {
    console.error('💥 Error generating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};