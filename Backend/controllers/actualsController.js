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
    request.input("Hours", sql.Decimal(5, 2), hours);

    const result = await request.query(`
      INSERT INTO Actuals (UserId, Category, Project, StartDate, EndDate, Hours)
      OUTPUT INSERTED.*
      VALUES (@UserId, @Category, @Project, @StartDate, @EndDate, @Hours)
    `);

    console.log('✅ Insert successful:', result.recordset[0]);

    res.status(201).json({ message: "Actual entry added successfully" });
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
        AND StartDate >= @StartDate
        AND EndDate <= @EndDate
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

// Get user statistics for dashboard
exports.getUserStats = async (req, res) => {
  const userId = req.user.id;
  
  try {
    await sql.connect(config);
    const request = new sql.Request();
    request.input("UserId", sql.Int, userId);
    
    // Get current date info
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Get hours logged this week
    request.input("StartOfWeek", sql.DateTime, startOfWeek);
    request.input("EndOfWeek", sql.DateTime, endOfWeek);
    
    const weeklyHoursResult = await request.query(`
      SELECT ISNULL(SUM(Hours), 0) as WeeklyHours
      FROM Actuals 
      WHERE UserId = @UserId
        AND StartDate >= @StartOfWeek
        AND EndDate <= @EndOfWeek
    `);
    
    // Calculate capacity utilization (excluding Admin/Leave entries)
    // Assuming 40 hours per week target, 80% = 32 hours
    const projectHoursResult = await request.query(`
      SELECT ISNULL(SUM(Hours), 0) as ProjectHours
      FROM Actuals 
      WHERE UserId = @UserId
        AND Category != 'Admin'
        AND StartDate >= @StartOfWeek
        AND EndDate <= @EndOfWeek
    `);
    
    const weeklyHours = weeklyHoursResult.recordset[0].WeeklyHours;
    const projectHours = projectHoursResult.recordset[0].ProjectHours;
    const targetHours = 32; // 80% of 40 hours
    const capacityUtilization = targetHours > 0 
      ? Math.round((projectHours / targetHours) * 100) 
      : 0;
    
    res.status(200).json({
      weeklyHours: parseFloat(weeklyHours).toFixed(1),
      capacityUtilization: Math.min(capacityUtilization, 100), // Cap at 100%
      projectHours: parseFloat(projectHours).toFixed(1),
      targetHours
    });
  } catch (err) {
    console.error("Get User Stats Error:", err);
    res.status(500).json({ message: "Failed to fetch user statistics" });
  }
};