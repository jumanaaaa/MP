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

    console.log(`📊 [REPORTS] Starting for user ${userId}, range: ${fromDate} to ${toDate}`);
    const queryStartTime = Date.now();

    const pool = await getPool();

    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);

    // ✅ OPTIMIZATION 1: Run all queries in PARALLEL
    const [individualPlansResult, actualsResult, masterPlansResult, projectsResult] = await Promise.all([
      // Query 1: Individual Plans
      (async () => {
        let query = `
          SELECT Id, Project, Role, StartDate, EndDate, Fields
          FROM IndividualPlan
          WHERE UserId = @userId
            AND (StartDate <= @endDate AND EndDate >= @startDate)
        `;
        if (projectFilter && projectFilter !== 'All Projects') {
          query += ` AND Project = @projectFilter`;
        }
        query += ` ORDER BY StartDate`; // ✅ Add ordering for consistency

        const request = pool.request();
        request.input('userId', sql.Int, userId);
        request.input('startDate', sql.Date, startDate);
        request.input('endDate', sql.Date, endDate);
        if (projectFilter && projectFilter !== 'All Projects') {
          request.input('projectFilter', sql.NVarChar, projectFilter);
        }
        return request.query(query);
      })(),

      // Query 2: Actuals
      (async () => {
        let query = `
          SELECT Category, Project, Hours, StartDate, EndDate
          FROM Actuals
          WHERE UserId = @userId
            AND StartDate >= @startDate
            AND EndDate <= @endDate
        `;
        if (projectFilter && projectFilter !== 'All Projects') {
          query += ` AND Project = @projectFilter`;
        }

        const request = pool.request();
        request.input('userId', sql.Int, userId);
        request.input('startDate', sql.Date, startDate);
        request.input('endDate', sql.Date, endDate);
        if (projectFilter && projectFilter !== 'All Projects') {
          request.input('projectFilter', sql.NVarChar, projectFilter);
        }
        return request.query(query);
      })(),

      // Query 3: Master Plans
      (async () => {
        let query = `
          SELECT mp.Id, mp.Project, mp.ProjectType, mp.StartDate, mp.EndDate
          FROM MasterPlan mp
          INNER JOIN MasterPlanPermissions perm ON mp.Id = perm.MasterPlanId
          WHERE perm.UserId = @userId
            AND (mp.StartDate <= @endDate AND mp.EndDate >= @startDate)
        `;
        if (projectFilter && projectFilter !== 'All Projects') {
          query += ` AND mp.Project = @projectFilter`;
        }

        const request = pool.request();
        request.input('userId', sql.Int, userId);
        request.input('startDate', sql.Date, startDate);
        request.input('endDate', sql.Date, endDate);
        if (projectFilter && projectFilter !== 'All Projects') {
          request.input('projectFilter', sql.NVarChar, projectFilter);
        }
        return request.query(query);
      })(),

      // Query 4: Available Projects
      (async () => {
        const request = pool.request();
        request.input('userId', sql.Int, userId);
        return request.query(`
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
      })()
    ]);

    console.log(`⏱️ [REPORTS] Parallel queries completed in ${Date.now() - queryStartTime}ms`);

    const individualPlans = individualPlansResult.recordset;
    const actuals = actualsResult.recordset;
    const masterPlans = masterPlansResult.recordset;
    const availableProjects = projectsResult.recordset.map(p => p.Project);

    console.log(`📋 [REPORTS] Found: ${individualPlans.length} plans, ${actuals.length} actuals, ${masterPlans.length} master plans`);

    // ✅ OPTIMIZATION 2: Cache working days calculation
    const workingDaysCache = new Map();
    const getWorkingDays = (start, end) => {
      const key = `${start.toISOString()}-${end.toISOString()}`;
      if (!workingDaysCache.has(key)) {
        workingDaysCache.set(key, calculateWorkingDays(start, end));
      }
      return workingDaysCache.get(key);
    };

    // Process individual plans
    let totalPlannedHours = 0;
    const plannedHoursByMonth = {};

    individualPlans.forEach(plan => {
      const planStart = new Date(plan.StartDate);
      const planEnd = new Date(plan.EndDate);
      
      const totalMonthsInPlan = calculateMonthsBetween(planStart, planEnd);
      const overlapMonths = calculateOverlapMonths(planStart, planEnd, startDate, endDate);
      
      // ✅ OPTIMIZATION 3: Try-catch JSON parsing
      let planTotalHours = 0;
      try {
        const fields = JSON.parse(plan.Fields || '{}');
        Object.entries(fields).forEach(([key, value]) => {
          if (key !== 'title' && key !== 'status' && value && typeof value === 'object' && value.hours) {
            planTotalHours += parseFloat(value.hours || 0);
          }
        });
      } catch (e) {
        console.warn(`⚠️ [REPORTS] Failed to parse Fields for plan ${plan.Id}`);
      }

      if (planTotalHours === 0) {
        const workingDays = getWorkingDays(planStart, planEnd);
        planTotalHours = workingDays * 8;
      }

      const hoursPerMonth = planTotalHours / totalMonthsInPlan;
      totalPlannedHours += hoursPerMonth * overlapMonths;

      let currentMonth = new Date(Math.max(planStart, startDate));
      const periodEnd = new Date(Math.min(planEnd, endDate));

      while (currentMonth <= periodEnd) {
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        plannedHoursByMonth[monthKey] = (plannedHoursByMonth[monthKey] || 0) + hoursPerMonth;
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
    });

    // ✅ OPTIMIZATION 4: Single pass through actuals
    const actualsTotal = actuals
      .filter(a => a.Category !== 'Admin/Others')
      .reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0);

    const actualsByMonth = {};
    const actualsByProject = {}; // ✅ Build index for faster lookup

    actuals.forEach(actual => {
      if (actual.Category === 'Admin/Others') return;
      
      const actualDate = new Date(actual.StartDate);
      const monthKey = `${actualDate.getFullYear()}-${String(actualDate.getMonth() + 1).padStart(2, '0')}`;
      
      actualsByMonth[monthKey] = (actualsByMonth[monthKey] || 0) + parseFloat(actual.Hours || 0);
      
      // ✅ Index by project for O(1) lookup
      if (actual.Project) {
        if (!actualsByProject[actual.Project]) {
          actualsByProject[actual.Project] = 0;
        }
        actualsByProject[actual.Project] += parseFloat(actual.Hours || 0);
      }
    });

    // ✅ OPTIMIZATION 5: Calculate project performance with indexed lookup
    const projectPerformance = masterPlans.map(plan => {
      const planStart = new Date(plan.StartDate);
      const planEnd = new Date(plan.EndDate);
      
      const workingDays = getWorkingDays(planStart, planEnd);
      const plannedHours = workingDays * 8;

      // ✅ O(1) lookup instead of filter loop
      const spentHours = actualsByProject[plan.Project] || 0;
      
      const efficiency = plannedHours > 0 
        ? ((spentHours / plannedHours) * 100).toFixed(1)
        : 0;

      return {
        project: plan.Project,
        activityType: plan.ProjectType || 'General',
        plannedHours: parseFloat(plannedHours.toFixed(2)),
        spentHours: parseFloat(spentHours.toFixed(2)),
        efficiency: parseFloat(efficiency)
      };
    });

    // Calculate capacity by month
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

    // Summary metrics
    const difference = actualsTotal - totalPlannedHours;
    const accuracy = totalPlannedHours > 0
      ? Math.min(100, ((actualsTotal / totalPlannedHours) * 100)).toFixed(1)
      : 0;

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
        total: parseFloat(actualsTotal.toFixed(2))
      },
      capacityByMonth: capacityByMonth,
      projectPerformance: projectPerformance,
      availableProjects: ['All Projects', ...availableProjects],
      dailyBreakdown: []
    };

    console.log(`✅ [REPORTS] Generated in ${Date.now() - queryStartTime}ms`);
    res.status(200).json(report);

  } catch (error) {
    console.error('💥 [REPORTS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};