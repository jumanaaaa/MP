const { sql, config } = require("../db");

// Create Actual Entry
exports.createActual = async (req, res) => {
  const { category, project, startDate, endDate } = req.body;
  let { hours } = req.body;


  // Debug logs
  console.log('🔍 Full req.user object:', req.user);
  console.log('🔍 req.user.id:', req.user.id);
  console.log('🔍 Type of req.user.id:', typeof req.user.id);
  console.log('🔍 Request body:', req.body);

  const userId = req.user.id;

  if (!category || !startDate || !endDate || !hours) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!userId) {
    console.error('❌ UserId is null or undefined!');
    return res.status(400).json({ message: "User ID not found in token" });
  }

  try {
    await sql.connect(config);
    const request = new sql.Request();

    console.log('📝 Inserting with UserId:', userId);

    request.input("UserId", sql.Int, userId);
    request.input("Category", sql.NVarChar, category);
    request.input("Project", sql.NVarChar, project || null);
    request.input("StartDate", sql.Date, startDate);
    request.input("EndDate", sql.Date, endDate);
    // 🔒 Capacity-aware adjustment (ONLY for Project / Operations)
    if (category !== 'Admin/Others') {
      const pool = await sql.connect(config);

      const dailyCapacity = await resolveDailyCapacity(
        userId,
        startDate,
        endDate,
        pool
      );

      const maxAllowedHours = Object.values(dailyCapacity)
        .reduce((sum, d) => sum + d.remaining, 0);

      if (maxAllowedHours <= 0) {
        return res.status(400).json({
          message: "No remaining capacity for selected date range"
        });
      }

      if (!hours || hours > maxAllowedHours) {
        console.log(`⚠️ Hours adjusted from ${hours} → ${maxAllowedHours}`);
        hours = maxAllowedHours;
      }
    }

    request.input("Hours", sql.Decimal(10, 2), hours);

    const result = await request.query(`
      INSERT INTO Actuals (UserId, Category, Project, StartDate, EndDate, Hours)
      OUTPUT INSERTED.*
      VALUES (@UserId, @Category, @Project, @StartDate, @EndDate, @Hours)
    `);

    console.log('✅ Insert successful:', result.recordset[0]);

    res.status(201).json({
      message: "Actual entry added successfully",
      actual: result.recordset[0]
    });
  } catch (err) {
    console.error("Create Actual Error:", err);
    res.status(500).json({ message: "Failed to add actual entry" });
  }
};

// Get All Actual Entries for logged-in user
exports.getActuals = async (req, res) => {
  const userId = req.user.id;

  console.log('🔍 Getting actuals for userId:', userId);

  try {
    await sql.connect(config);
    const request = new sql.Request();
    request.input("UserId", sql.Int, userId);

    const result = await request.query(`
      SELECT 
        Id,
        Category,
        Project,
        StartDate,
        EndDate,
        Hours,
        CreatedAt
      FROM Actuals 
      WHERE UserId = @UserId
      ORDER BY CreatedAt DESC
    `);

    console.log('✅ Found actuals:', result.recordset.length);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Get Actuals Error:", err);
    res.status(500).json({ message: "Failed to fetch actual entries" });
  }
};

// Get system actuals (ManicTime)
exports.getSystemActuals = async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;

  try {
    await sql.connect(config);

    // 1️⃣ Get user's device
    const userResult = await new sql.Request()
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT DeviceName
        FROM Users
        WHERE Id = @UserId
      `);

    if (!userResult.recordset.length) {
      return res.json([]);
    }

    const deviceName = userResult.recordset[0].DeviceName;

    // 2️⃣ Aggregate ManicTime data
    const result = await new sql.Request()
      .input("deviceName", sql.NVarChar, deviceName)
      .input("startDate", sql.DateTime, new Date(startDate))
      .input("endDate", sql.DateTime, new Date(endDate))
      .query(`
        SELECT 
          activityName,
          SUM(duration) / 3600.0 AS hours
        FROM manictime_summary
        WHERE deviceName = @deviceName
          AND startTime BETWEEN @startDate AND @endDate
        GROUP BY activityName
        ORDER BY hours DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Get System Actuals Error:", err);
    res.status(500).json({ message: "Failed to fetch system actuals" });
  }
};

// Calculate capacity utilization for a user
exports.getCapacityUtilization = async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;

  try {
    await sql.connect(config);
    const request = new sql.Request();
    request.input("UserId", sql.Int, userId);
    request.input("StartDate", sql.Date, startDate);
    request.input("EndDate", sql.Date, endDate);

    // Get total hours excluding Admin (leaves)
    const result = await request.query(`
      SELECT 
        SUM(CASE WHEN Category != 'Admin' THEN Hours ELSE 0 END) as ProjectHours,
        SUM(Hours) as TotalHours
      FROM Actuals 
      WHERE UserId = @UserId
        AND NOT (
  EndDate < @StartDate
  OR StartDate > @EndDate
)
    `);

    const data = result.recordset[0];

    // Calculate working days between dates (excluding weekends)
    // This is a simplified calculation - you may want to also exclude holidays
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) { // Not Sunday or Saturday
        workingDays++;
      }
    }

    // Working hours per day: 8:30 AM - 6:00 PM = 9.5 hours - 1.5 hours lunch = 8 hours
    const hoursPerDay = 8;
    const totalAvailableHours = workingDays * hoursPerDay;
    const utilizationTarget = totalAvailableHours * 0.8; // 80% target

    const utilizationPercentage = totalAvailableHours > 0
      ? (data.ProjectHours / totalAvailableHours) * 100
      : 0;

    res.status(200).json({
      projectHours: data.ProjectHours || 0,
      totalHours: data.TotalHours || 0,
      workingDays,
      totalAvailableHours,
      utilizationTarget,
      utilizationPercentage: utilizationPercentage.toFixed(2),
      isAboveTarget: utilizationPercentage >= 80
    });
  } catch (err) {
    console.error("Get Capacity Utilization Error:", err);
    res.status(500).json({ message: "Failed to calculate capacity utilization" });
  }
};

// Convert hours to man-days
exports.convertToManDays = (hours) => {
  const hoursPerDay = 8; // 8 hours per working day (excluding lunch)
  return (hours / hoursPerDay).toFixed(2);
};

// At the top of actualsController.js, add this helper
const Holidays = require('date-holidays');

/**
 * Resolve per-day capacity for a user within a date range.
 * Capacity rules:
 * - Weekends & SG public holidays = 0h
 * - Normal workday = 8h
 * - Admin/Others reduces capacity
 * - Project/Operations consumes capacity
 */
const resolveDailyCapacity = async (userId, startDate, endDate, pool) => {
  const hd = new Holidays('SG');

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("StartDate", sql.Date, startDate)
    .input("EndDate", sql.Date, endDate)
    .query(`
      SELECT Category, StartDate, EndDate, Hours
      FROM Actuals
      WHERE UserId = @UserId
        AND NOT (EndDate < @StartDate OR StartDate > @EndDate)
    `);

  const actuals = result.recordset;

  const days = {};

  for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0];
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isHoliday = hd.isHoliday(d);

    days[dateKey] = {
      capacity: (isWeekend || isHoliday) ? 0 : 8,
      used: 0,
      remaining: 0
    };
  }

  actuals.forEach(a => {
    const activeDays = [];

    for (let d = new Date(a.StartDate); d <= new Date(a.EndDate); d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      if (days[dateKey]) activeDays.push(dateKey);
    }

    if (!activeDays.length) return;

    const hoursPerDay = a.Hours / activeDays.length;

    activeDays.forEach(dateKey => {
      if (a.Category === 'Admin/Others') {
        days[dateKey].capacity -= Math.min(hoursPerDay, 8);
      } else {
        days[dateKey].used += hoursPerDay;
      }
    });
  });

  Object.values(days).forEach(d => {
    d.capacity = Math.max(d.capacity, 0);
    d.remaining = Math.max(d.capacity - d.used, 0);
  });

  return days;
};

/**
 * Calculate effective working days excluding:
 * 1. Weekends (Sat/Sun)
 * 2. Singapore public holidays
 * 3. User's logged leave days that fall within the period
 */
const calculateEffectiveWorkingDays = async (userId, startDate, endDate, pool) => {
  const hd = new Holidays('SG');
  
  // Get user's leave entries that overlap with this period
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
  
  // Create a Set of all leave dates (as YYYY-MM-DD strings)
  const leaveDates = new Set();
  leaveEntries.forEach(entry => {
    const leaveStart = new Date(entry.StartDate);
    const leaveEnd = new Date(entry.EndDate);
    
    for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) { // Only count weekday leaves
        leaveDates.add(d.toISOString().split('T')[0]);
      }
    }
  });

  // Count working days excluding weekends, holidays, and leave
  let totalWorkingDays = 0;
  let holidaysInPeriod = [];
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    const dateStr = d.toISOString().split('T')[0];
    const isWeekend = (day === 0 || day === 6);
    const holiday = hd.isHoliday(d);
    const isOnLeave = leaveDates.has(dateStr);
    
    if (!isWeekend) {
      if (holiday) {
        holidaysInPeriod.push({ date: dateStr, name: holiday[0]?.name || 'Public Holiday' });
      }
      
      if (!holiday && !isOnLeave) {
        totalWorkingDays++;
      }
    }
  }

  return {
    totalWorkingDays,
    leaveDays: leaveDates.size,
    holidaysInPeriod
  };
};

// Get user statistics for dashboard with time period filter
exports.getUserStats = async (req, res) => {
  const userId = req.user.id;
  const { period = 'week' } = req.query; // 'week' or 'month'

  try {
    await sql.connect(config);
    const pool = await sql.connect(config);

    // Get current date info
    const today = new Date();
    let startDate, endDate;

    if (period === 'month') {
      // Start of current month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      
      // End of current month
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Start of week (Monday)
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust if Sunday
      startDate = new Date(today);
      startDate.setDate(today.getDate() + diff);
      startDate.setHours(0, 0, 0, 0);

      // End of week (Friday)
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 4);
      endDate.setHours(23, 59, 59, 999);
    }

    console.log(`📊 Calculating stats for ${period}: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get hours logged (EXCLUDING Admin/Others category)
    const hoursResult = await pool.request()
      .input("UserId", sql.Int, userId)
      .input("StartDate", sql.DateTime, startDate)
      .input("EndDate", sql.DateTime, endDate)
      .query(`
        SELECT ISNULL(SUM(Hours), 0) as TotalHours
        FROM Actuals 
        WHERE UserId = @UserId
          AND Category != 'Admin/Others'
          AND NOT (EndDate < @StartDate OR StartDate > @EndDate)
      `);

    const totalHours = parseFloat(hoursResult.recordset[0].TotalHours);

    // Calculate effective working days
    const { totalWorkingDays, leaveDays, holidaysInPeriod } = 
      await calculateEffectiveWorkingDays(userId, startDate, endDate, pool);

    console.log(`📅 Working days: ${totalWorkingDays}, Leave days: ${leaveDays}, Holidays: ${holidaysInPeriod.length}`);

    // Calculate capacity
    const targetHours = totalWorkingDays * 8;
    const capacityUtilization = targetHours > 0
      ? Math.round((totalHours / targetHours) * 100)
      : 0;

    // Calculate leave days from hours (for display)
    const leaveResult = await pool.request()
      .input("UserId", sql.Int, userId)
      .input("StartDate", sql.DateTime, startDate)
      .input("EndDate", sql.DateTime, endDate)
      .query(`
        SELECT ISNULL(SUM(Hours), 0) / 8.0 as LeaveDays
        FROM Actuals 
        WHERE UserId = @UserId
          AND Category = 'Admin/Others'
          AND NOT (EndDate < @StartDate OR StartDate > @EndDate)
      `);

    const displayLeaveDays = Math.round(leaveResult.recordset[0].LeaveDays * 10) / 10;

    res.status(200).json({
      period,
      totalHours: totalHours.toFixed(1),
      capacityUtilization,
      projectHours: totalHours.toFixed(1), // Same as totalHours since we exclude Admin
      leaveDays: displayLeaveDays.toFixed(1),
      effectiveWorkingDays: totalWorkingDays,
      targetHours,
      holidaysInPeriod: holidaysInPeriod.map(h => h.name),
      breakdown: {
        totalDaysInPeriod: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1,
        weekendDays: 0, // Calculated in the loop above
        publicHolidays: holidaysInPeriod.length,
        leaveDaysTaken: leaveDays,
        effectiveWorkingDays: totalWorkingDays
      }
    });
  } catch (err) {
    console.error("Get User Stats Error:", err);
    res.status(500).json({ message: "Failed to fetch user statistics" });
  }
};

// NEW: Get Singapore public holidays for auto-fill
exports.getSingaporeHolidays = async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  
  try {
    const hd = new Holidays('SG');
    const holidays = hd.getHolidays(year);
    
    const formattedHolidays = holidays.map(h => ({
      date: h.date.split(' ')[0], // YYYY-MM-DD format
      name: h.name,
      type: h.type
    }));
    
    res.status(200).json(formattedHolidays);
  } catch (err) {
    console.error("Get Holidays Error:", err);
    res.status(500).json({ message: "Failed to fetch holidays" });
  }
};