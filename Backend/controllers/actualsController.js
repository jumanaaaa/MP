const { sql, config } = require("../db");

// Create Actual Entry
exports.createActual = async (req, res) => {
  const { category, project, startDate, endDate, hours } = req.body;

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

// At the top of actualsController.js
const Holidays = require('date-holidays');

// Get user statistics for dashboard with time period filter
exports.getUserStats = async (req, res) => {
  const userId = req.user.id;
  const { period = 'week' } = req.query; // 'week' or 'month'

  try {
    await sql.connect(config);
    const request = new sql.Request();
    request.input("UserId", sql.Int, userId);

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
      // Start of week (Sunday)
      startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay());
      startDate.setHours(0, 0, 0, 0);

      // End of week (Saturday)
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    }

    request.input("StartDate", sql.DateTime, startDate);
    request.input("EndDate", sql.DateTime, endDate);

    // Get hours logged (EXCLUDING Admin/Others category - non-working hours)
    const hoursResult = await request.query(`
      SELECT ISNULL(SUM(Hours), 0) as TotalHours
      FROM Actuals 
      WHERE UserId = @UserId
        AND Category != 'Admin/Others'
        AND NOT (EndDate < @StartDate OR StartDate > @EndDate)
    `);

    // Get project hours (for capacity calculation)
    const projectHoursResult = await request.query(`
      SELECT ISNULL(SUM(Hours), 0) as ProjectHours
      FROM Actuals 
      WHERE UserId = @UserId
        AND Category IN ('Project', 'Operations')
        AND NOT (EndDate < @StartDate OR StartDate > @EndDate)
    `);

    // Get leave taken (Admin/Others category)
    const leaveResult = await request.query(`
      SELECT ISNULL(SUM(Hours), 0) / 8.0 as LeaveDays
      FROM Actuals 
      WHERE UserId = @UserId
        AND Category = 'Admin/Others'
        AND NOT (EndDate < @StartDate OR StartDate > @EndDate)
    `);

    const totalHours = hoursResult.recordset[0].TotalHours;
    const projectHours = projectHoursResult.recordset[0].ProjectHours;
    const leaveDays = Math.round(leaveResult.recordset[0].LeaveDays * 10) / 10; // Round to 1 decimal

    // Calculate working days in period (excluding weekends and Singapore public holidays)
    let workingDays = 0;
    const hd = new Holidays('SG'); // Singapore holidays
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      const isWeekend = (day === 0 || day === 6);
      const isHoliday = hd.isHoliday(d);
      
      if (!isWeekend && !isHoliday) {
        workingDays++;
      }
    }

    // Subtract user's leave days from working days
    const effectiveWorkingDays = Math.max(0, workingDays - leaveDays);
    const targetHours = effectiveWorkingDays * 8;

    const capacityUtilization = targetHours > 0
      ? Math.round((projectHours / targetHours) * 100)
      : 0;

    res.status(200).json({
      period,
      totalHours: parseFloat(totalHours).toFixed(1),
      capacityUtilization: Math.min(capacityUtilization, 100),
      projectHours: parseFloat(projectHours).toFixed(1),
      leaveDays: leaveDays.toFixed(1),
      workingDays,
      effectiveWorkingDays,
      targetHours
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