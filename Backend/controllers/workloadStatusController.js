const { sql, getPool } = require("../db/pool");const Holidays = require('date-holidays');

/**
 * Calculate effective working days for a user in a period
 */
const calculateEffectiveWorkingDays = async (userId, startDate, endDate, pool) => {
  const hd = new Holidays('SG');
  
  // Get user's leave entries
  const leaveResult = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("StartDate", sql.DateTime, startDate)
    .input("EndDate", sql.DateTime, endDate)
    .query(`
      SELECT StartDate, EndDate
      FROM Actuals 
      WHERE UserId = @UserId
        AND Category = 'Admin/Others'
        AND NOT (EndDate < @StartDate OR StartDate > @EndDate)
    `);

  const leaveEntries = leaveResult.recordset;
  
  // Create Set of leave dates
  const leaveDates = new Set();
  leaveEntries.forEach(entry => {
    const leaveStart = new Date(entry.StartDate);
    const leaveEnd = new Date(entry.EndDate);
    
    for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) {
        leaveDates.add(d.toISOString().split('T')[0]);
      }
    }
  });

  // Count working days
  let totalWorkingDays = 0;
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    const dateStr = d.toISOString().split('T')[0];
    const isWeekend = (day === 0 || day === 6);
    const isHoliday = hd.isHoliday(d);
    const isOnLeave = leaveDates.has(dateStr);
    
    if (!isWeekend && !isHoliday && !isOnLeave) {
      totalWorkingDays++;
    }
  }

  return {
    totalWorkingDays,
    leaveDays: leaveDates.size
  };
};

/**
 * Get workload status for all users (PERIOD-BASED: week or month)
 */
exports.getWorkloadStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { period = 'week' } = req.query; // 'week' or 'month'

    console.log(`📊 Calculating workload status for all users (${period})...`);
    
    const pool = await getPool();

    // Calculate period dates
    const today = new Date();
    let startDate, endDate;

    if (period === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(today);
      startDate.setDate(today.getDate() + diff);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 4);
      endDate.setHours(23, 59, 59, 999);
    }

    console.log(`📅 Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get all active users
    const usersResult = await pool.query(`
      SELECT 
        Id,
        FirstName,
        LastName,
        Email,
        Department,
        Team,
        Role
      FROM Users
      WHERE Role IN ('admin', 'member')
      ORDER BY FirstName, LastName
    `);

    const users = usersResult.recordset;
    console.log(`👥 Found ${users.length} users`);

    // Get actuals for period
    const actualsResult = await pool.request()
      .input("StartDate", sql.DateTime, startDate)
      .input("EndDate", sql.DateTime, endDate)
      .query(`
        SELECT 
          UserId,
          Category,
          Project,
          Hours,
          StartDate,
          EndDate
        FROM Actuals
        WHERE NOT (EndDate < @StartDate OR StartDate > @EndDate)
      `);

    const actuals = actualsResult.recordset;
    console.log(`📋 Found ${actuals.length} actual entries`);

    const projectsResult = await pool.request()
      .input("StartDate", sql.DateTime, startDate)
      .input("EndDate", sql.DateTime, endDate)
      .query(`
    SELECT 
      UserId,
      Project,
      Category
    FROM Actuals
    WHERE NOT (EndDate < @StartDate OR StartDate > @EndDate)
      AND Category IN ('Project', 'Operations')
      AND Project IS NOT NULL
    GROUP BY UserId, Project, Category
  `);

    const projectAssignments = projectsResult.recordset;
    console.log(`📁 Found ${projectAssignments.length} project assignments`);

    // Calculate status for each user
    const userStatuses = await Promise.all(users.map(async (user) => {
      // Calculate effective working days for this user
      const { totalWorkingDays, leaveDays } = 
        await calculateEffectiveWorkingDays(user.Id, startDate, endDate, pool);

      // Get user's actuals
      const userActuals = actuals.filter(a => a.UserId === user.Id);
      
      // Calculate total hours (EXCLUDING Admin/Others)
      const totalHours = userActuals
        .filter(a => a.Category !== 'Admin/Others')
        .reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0);

      // Calculate category breakdown
      const projectHours = userActuals
        .filter(a => a.Category === 'Project')
        .reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0);
      
      const operationsHours = userActuals
        .filter(a => a.Category === 'Operations')
        .reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0);
      
      const adminHours = userActuals
        .filter(a => a.Category === 'Admin/Others')
        .reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0);

      // Calculate capacity
      const targetHours = totalWorkingDays * 8;
      const totalManDays = (totalHours / 8).toFixed(2);
      const utilizationPercentage = targetHours > 0
        ? ((totalHours / targetHours) * 100).toFixed(1)
        : 0;

      // Determine status
      let status;
      const utilization = parseFloat(utilizationPercentage);
      if (utilization > 100) {
        status = 'Overworked'; // Over 100% capacity
      } else if (utilization < 60) {
        status = 'Underutilized'; // Below 60% capacity
      } else {
        status = 'Optimal'; // 60-100% capacity
      }

      console.log(`👤 ${user.FirstName} ${user.LastName}: ${totalHours}h / ${targetHours}h (${utilizationPercentage}%) = ${status}`);

      const userProjects = projectAssignments
        .filter(p => p.UserId === user.Id)
        .map(p => ({
          name: p.Project,
          category: p.Category
        }));

      return {
        userId: user.Id,
        firstName: user.FirstName,
        lastName: user.LastName,
        email: user.Email,
        department: user.Department,
        team: user.Team || null,
        projects: userProjects,
        role: user.Role,
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalManDays: parseFloat(totalManDays),
        projectHours: parseFloat(projectHours.toFixed(2)),
        operationsHours: parseFloat(operationsHours.toFixed(2)),
        adminHours: parseFloat(adminHours.toFixed(2)),
        utilizationPercentage: parseFloat(utilizationPercentage),
        status: status,
        effectiveWorkingDays: totalWorkingDays,
        leaveDaysTaken: leaveDays,
        targetHours: targetHours
      };
    }));

    // Calculate summary
    const summary = {
      totalUsers: users.length,
      overworked: userStatuses.filter(u => u.status === 'Overworked').length,
      underutilized: userStatuses.filter(u => u.status === 'Underutilized').length,
      optimal: userStatuses.filter(u => u.status === 'Optimal').length
    };

    console.log('📊 Summary:', summary);

    res.status(200).json({
      success: true,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: summary,
      users: userStatuses
    });

  } catch (error) {
    console.error('💥 Error calculating workload status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate workload status',
      error: error.message
    });
  }
};

/**
 * Get workload status for current user only
 */
exports.getMyWorkloadStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'week' } = req.query;

    console.log(`📊 Calculating workload status for user ${userId} (${period})...`);

    const pool = await getPool();

    // Calculate period dates (same logic as above)
    const today = new Date();
    let startDate, endDate;

    if (period === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(today);
      startDate.setDate(today.getDate() + diff);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 4);
      endDate.setHours(23, 59, 59, 999);
    }

    // Get user info
    const userResult = await pool.query`
      SELECT 
        Id,
        FirstName,
        LastName,
        Email,
        Department,
        Role
      FROM Users
      WHERE Id = ${userId}
    `;

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.recordset[0];

    // Calculate effective working days
    const { totalWorkingDays } = 
      await calculateEffectiveWorkingDays(userId, startDate, endDate, pool);

    // Get actuals
    const actualsResult = await pool.request()
      .input("UserId", sql.Int, userId)
      .input("StartDate", sql.DateTime, startDate)
      .input("EndDate", sql.DateTime, endDate)
      .query(`
        SELECT 
          Category,
          Hours
        FROM Actuals
        WHERE UserId = @UserId
          AND NOT (EndDate < @StartDate OR StartDate > @EndDate)
      `);

    const actuals = actualsResult.recordset;

    // Calculate totals
    const totalHours = actuals
      .filter(a => a.Category !== 'Admin/Others')
      .reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0);
    
    const targetHours = totalWorkingDays * 8;
    const totalManDays = (totalHours / 8).toFixed(2);
    const utilizationPercentage = targetHours > 0
      ? ((totalHours / targetHours) * 100).toFixed(1)
      : 0;

    // Determine status
    let status;
    const utilization = parseFloat(utilizationPercentage);
    if (utilization > 100) {
      status = 'Overworked';
    } else if (utilization < 60) {
      status = 'Underutilized';
    } else {
      status = 'Optimal';
    }

    res.status(200).json({
      success: true,
      period,
      user: {
        userId: user.Id,
        firstName: user.FirstName,
        lastName: user.LastName,
        email: user.Email,
        department: user.Department,
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalManDays: parseFloat(totalManDays),
        utilizationPercentage: parseFloat(utilizationPercentage),
        status: status,
        effectiveWorkingDays: totalWorkingDays,
        targetHours: targetHours
      }
    });

  } catch (error) {
    console.error('💥 Error calculating user workload status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate workload status',
      error: error.message
    });
  }
};

// ===================== GET DAILY UTILIZATION (FOR CHART) =====================
exports.getDailyUtilization = async (req, res) => {
  try {
    const userId = req.user.id;
    const userDepartment = req.user.department;
    const { scope = 'personal' } = req.query; // 'personal' or 'team'

    // 🆕 CRITICAL FIX: Initialize Holidays
    const hd = new Holidays('SG');

    const pool = await getPool();

    // Calculate date range (last 7 days)
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6); // Last 7 days including today
    startDate.setHours(0, 0, 0, 0);

    let query = `
      SELECT 
        CONVERT(date, StartDate) as Date,
        SUM(Hours) as TotalHours
      FROM Actuals
      WHERE StartDate >= @startDate 
        AND EndDate <= @endDate
        AND Category != 'Admin/Others'
    `;

    if (scope === 'personal') {
      query += ` AND UserId = @userId`;
    } else if (scope === 'team') {
      query += ` AND UserId IN (
        SELECT Id FROM Users WHERE Department = @userDepartment
      )`;
    }

    query += `
      GROUP BY CONVERT(date, StartDate)
      ORDER BY Date
    `;

    const request = pool.request();
    request.input('startDate', sql.Date, startDate);
    request.input('endDate', sql.Date, endDate);
    
    if (scope === 'personal') {
      request.input('userId', sql.Int, userId);
    } else if (scope === 'team') {
      request.input('userDepartment', sql.NVarChar, userDepartment);
    }

    const result = await request.query(query);

    // Create array with all 7 days (fill missing days with 0)
    const dailyData = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];
      
      const dayData = result.recordset.find(r => 
        new Date(r.Date).toISOString().split('T')[0] === dateString
      );

      // Calculate target hours for the day (8 hours if working day, 0 if weekend/holiday)
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = hd.isHoliday(currentDate);
      const targetHours = (!isWeekend && !isHoliday) ? 8 : 0;

      const actualHours = dayData ? parseFloat(dayData.TotalHours) : 0;
      const utilization = targetHours > 0 
        ? Math.round((actualHours / targetHours) * 100)
        : 0;

      dailyData.push({
        day: dayNames[dayOfWeek],
        date: dateString,
        value: utilization,
        actualHours: parseFloat(actualHours.toFixed(2)),
        targetHours: targetHours
      });
    }

    // Calculate average utilization
    const workingDays = dailyData.filter(d => d.targetHours > 0);
    const avgUtilization = workingDays.length > 0
      ? Math.round(workingDays.reduce((sum, d) => sum + d.value, 0) / workingDays.length)
      : 0;

    res.status(200).json({
      success: true,
      scope,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      averageUtilization: avgUtilization,
      dailyBreakdown: dailyData
    });

  } catch (error) {
    console.error('❌ Get Daily Utilization Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily utilization',
      error: error.message
    });
  }
};