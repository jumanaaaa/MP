const { sql, getPool } = require("../db/pool");
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
    const pool = await getPool();
    const request = pool.request();

    console.log('📝 Inserting with UserId:', userId);

    // ✅ CHECK FOR DUPLICATE/OVERLAPPING DATES
    const duplicateCheck = await pool.request()
      .input("UserId", sql.Int, userId)
      .input("Project", sql.NVarChar, project)
      .input("StartDate", sql.Date, startDate)
      .input("EndDate", sql.Date, endDate)
      .query(`
    SELECT TOP 1 
      Id,
      Category,
      Project,
      StartDate,
      EndDate,
      Hours
    FROM Actuals
    WHERE UserId = @UserId
      AND Project = @Project
      AND (
        -- Check for any date overlap for the SAME project
        (@StartDate <= EndDate AND @EndDate >= StartDate)
      )
  `);

    if (duplicateCheck.recordset.length > 0) {
      const duplicate = duplicateCheck.recordset[0];

      // Format dates for error message
      const dupStart = new Date(duplicate.StartDate).toLocaleDateString('en-GB');
      const dupEnd = new Date(duplicate.EndDate).toLocaleDateString('en-GB');

      console.log('⚠️ Duplicate date range found:', duplicate);

      return res.status(409).json({
        message: "Duplicate Entry Detected",
        duplicate: {
          project: duplicate.Project || 'N/A',
          category: duplicate.Category,
          startDate: dupStart,
          endDate: dupEnd,
          hours: duplicate.Hours
        },
        error: `You already have an entry with overlapping dates:\n\n` +
          `• Project: ${duplicate.Project || 'N/A'}\n` +
          `• Category: ${duplicate.Category}\n` +
          `• Date Range: ${dupStart} - ${dupEnd}\n` +
          `• Hours: ${duplicate.Hours}h\n\n` +
          `Please select different dates or edit the existing entry.`
      });
    }

    request.input("UserId", sql.Int, userId);
    request.input("Category", sql.NVarChar, category);
    request.input("Project", sql.NVarChar, project || null);
    request.input("StartDate", sql.Date, startDate);
    request.input("EndDate", sql.Date, endDate);

    // 🔒 Capacity-aware adjustment (ONLY for Project / Operations)
    if (category !== 'Admin/Others') {
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

  let pool;

  try {
    pool = await getPool();
    const request = pool.request();
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

// Update Actual Entry
exports.updateActual = async (req, res) => {
  const { id } = req.params;
  const { category, project, startDate, endDate, hours } = req.body;
  const userId = req.user.id;

  if (!category || !startDate || !endDate || !hours) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const pool = await getPool();
    
    // Verify ownership
    const ownerCheck = await pool.request()
      .input("Id", sql.Int, id)
      .input("UserId", sql.Int, userId)
      .query(`SELECT Id FROM Actuals WHERE Id = @Id AND UserId = @UserId`);

    if (ownerCheck.recordset.length === 0) {
      return res.status(403).json({ message: "You can only edit your own entries" });
    }

    // Check for duplicates (excluding current entry)
    const duplicateCheck = await pool.request()
      .input("Id", sql.Int, id)
      .input("UserId", sql.Int, userId)
      .input("Project", sql.NVarChar, project)
      .input("StartDate", sql.Date, startDate)
      .input("EndDate", sql.Date, endDate)
      .query(`
        SELECT TOP 1 Id, Category, Project, StartDate, EndDate, Hours
        FROM Actuals
        WHERE UserId = @UserId
          AND Id != @Id
          AND Project = @Project
          AND (@StartDate <= EndDate AND @EndDate >= StartDate)
      `);

    if (duplicateCheck.recordset.length > 0) {
      const duplicate = duplicateCheck.recordset[0];
      const dupStart = new Date(duplicate.StartDate).toLocaleDateString('en-GB');
      const dupEnd = new Date(duplicate.EndDate).toLocaleDateString('en-GB');

      return res.status(409).json({
        message: "Duplicate Entry Detected",
        error: `You already have an entry with overlapping dates:\n\n` +
          `• Project: ${duplicate.Project || 'N/A'}\n` +
          `• Category: ${duplicate.Category}\n` +
          `• Date Range: ${dupStart} - ${dupEnd}\n` +
          `• Hours: ${duplicate.Hours}h\n\n` +
          `Please select different dates.`
      });
    }

    // Update the entry
    const result = await pool.request()
      .input("Id", sql.Int, id)
      .input("Category", sql.NVarChar, category)
      .input("Project", sql.NVarChar, project || null)
      .input("StartDate", sql.Date, startDate)
      .input("EndDate", sql.Date, endDate)
      .input("Hours", sql.Decimal(10, 2), hours)
      .query(`
        UPDATE Actuals
        SET 
          Category = @Category,
          Project = @Project,
          StartDate = @StartDate,
          EndDate = @EndDate,
          Hours = @Hours,
          UpdatedAt = GETDATE()
        OUTPUT INSERTED.*
        WHERE Id = @Id
      `);

    console.log('✅ Update successful:', result.recordset[0]);

    res.status(200).json({
      message: "Actual entry updated successfully",
      actual: result.recordset[0]
    });
  } catch (err) {
    console.error("Update Actual Error:", err);
    res.status(500).json({ message: "Failed to update actual entry" });
  }
};

// Get system actuals (ManicTime)
exports.getSystemActuals = async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;

  try {
    const pool = await getPool();

    // 1️⃣ Get user's device
    const userResult = await pool.request()
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

    // 2️⃣ Check if data exists for this date range
    const checkData = await pool.request()
      .input("deviceName", sql.NVarChar, deviceName)
      .input("startDate", sql.DateTime, new Date(startDate))
      .input("endDate", sql.DateTime, new Date(endDate))
      .query(`
        SELECT COUNT(*) as count
        FROM manictime_summary
        WHERE deviceName = @deviceName
          AND startTime BETWEEN @startDate AND @endDate
      `);

    const hasData = checkData.recordset[0].count > 0;

    // 🔄 If no data, fetch it from ManicTime API
    // 🔄 If no data, fetch it from ManicTime API
    if (!hasData) {
      console.log(`⚠️ No data for ${deviceName} (${userId}) from ${startDate} to ${endDate}, fetching...`);

      try {
        // Get user's subscription info
        const subResult = await pool.request()
          .input("UserId", sql.Int, userId)
          .query(`
        SELECT 
          u.TimelineKey,
          s.Id,
          s.SubscriptionName,
          s.WorkspaceId,
          s.ClientId,
          s.ClientSecret,
          s.BaseUrl
        FROM Users u
        INNER JOIN ManicTimeSubscriptions s ON u.SubscriptionId = s.Id
        WHERE u.Id = @UserId AND s.IsActive = 1
      `);

        if (subResult.recordset.length === 0) {
          console.log(`⚠️ No active ManicTime subscription for user ${userId}`);
          return res.json([]);
        }

        const sub = subResult.recordset[0];

        console.log(`📋 Found subscription: ${sub.SubscriptionName}`);
        console.log(`🔑 WorkspaceId: ${sub.WorkspaceId}`);
        console.log(`📱 TimelineKey: ${sub.TimelineKey}`);

        // Validate required fields
        if (!sub.TimelineKey) {
          console.error(`❌ User ${userId} has no TimelineKey configured`);
          return res.json([]);
        }

        if (!sub.WorkspaceId || !sub.ClientId || !sub.ClientSecret) {
          console.error(`❌ Subscription ${sub.SubscriptionName} has missing credentials`);
          return res.json([]);
        }

        // Fetch data directly using existing pool
        const { getValidManicTimeToken } = require('../middleware/manictimeauth');
        const axios = require('axios');

        const tokenResult = await getValidManicTimeToken({
          Id: sub.Id,
          SubscriptionName: sub.SubscriptionName,
          WorkspaceId: sub.WorkspaceId,
          ClientId: sub.ClientId,
          ClientSecret: sub.ClientSecret,
          BaseUrl: sub.BaseUrl
        });

        console.log(`🔍 Token result type:`, typeof tokenResult);
        console.log(`🔍 Token result value:`, tokenResult);
        console.log(`🔍 Token result is null?`, tokenResult === null);
        console.log(`🔍 Token result is undefined?`, tokenResult === undefined);
        console.log(`🔍 Token result is object?`, typeof tokenResult === 'object');

        if (!tokenResult) {
          console.error(`❌ Failed to get ManicTime token for ${sub.SubscriptionName}`);
          return res.json([]);
        }

        const token = typeof tokenResult === 'string' ? tokenResult : tokenResult?.token || tokenResult?.accessToken;

        console.log(`✅ Extracted token:`, token ? 'YES' : 'NO');

        console.log(`✅ Got token for ${sub.SubscriptionName}`);

        const url = `${sub.BaseUrl}/${sub.WorkspaceId}/api/timelines/${sub.TimelineKey}/activities` +
          `?fromTime=${new Date(startDate).toISOString()}&toTime=${new Date(endDate).toISOString()}`;

        console.log(`📡 Fetching ManicTime data for ${deviceName}...`);
        console.log(`🔗 URL: ${url.substring(0, 100)}...`);

        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.manictime.v3+json"
          }
        });

        const { normalizeManicTimeEntities } = require('../utils/manictimeNormalizer');
        const rawEntities = response.data.entities || [];

        console.log(`📥 Received ${rawEntities.length} raw entities from ManicTime`);

        const activities = normalizeManicTimeEntities(rawEntities);

        console.log(`✅ Normalized to ${activities.length} activities`);

        // Insert activities into database
        for (const activity of activities) {
          await pool.request()
            .input("timelineKey", sql.NVarChar, sub.TimelineKey)
            .input("deviceName", sql.NVarChar, deviceName)
            .input("activityName", sql.NVarChar, activity.name)
            .input("startTime", sql.DateTime, activity.start)
            .input("duration", sql.Int, activity.duration)
            .input("groupId", sql.Int, activity.groupId)
            .query(`
          INSERT INTO manictime_summary
          (timelineKey, deviceName, activityName, startTime, duration, groupId)
          VALUES (@timelineKey, @deviceName, @activityName, @startTime, @duration, @groupId)
        `);
        }

        console.log(`✅ Inserted ${activities.length} activities for ${deviceName}`);

      } catch (syncErr) {
        console.error(`❌ On-demand sync failed:`, syncErr.message);
        console.error(`Stack:`, syncErr.stack);
      }
    } else {
      console.log(`✅ Data already exists for ${deviceName} (${startDate} to ${endDate})`);
    }

    // 3️⃣ Fetch and return the data
    const result = await pool.request()
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

    console.log(`📊 Returning ${result.recordset.length} activities`);
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
    const pool = await getPool();
    const request = pool.request();
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

// At the top of actualsController.js,   helper
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
      SELECT StartDate, EndDate, Hours
FROM Actuals 
WHERE UserId = @UserId
  AND Category = 'Admin/Others'
  AND NOT (EndDate < @StartDate OR StartDate > @EndDate)
    `);

  const leaveEntries = leaveResult.recordset;

  // Create a Set of all leave dates (as YYYY-MM-DD strings)
  let leaveHours = 0;

  leaveEntries.forEach(entry => {
    leaveHours += entry.Hours || 0;
  });

  const leaveDays = leaveHours / 8;

  // Count working days excluding weekends, holidays, and leave
  let totalWorkingDays = 0;
  let holidaysInPeriod = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    const dateStr = d.toISOString().split('T')[0];
    const isWeekend = (day === 0 || day === 6);
    const holiday = hd.isHoliday(d);

    if (!isWeekend) {
      if (holiday) {
        holidaysInPeriod.push({ date: dateStr, name: holiday[0]?.name || 'Public Holiday' });
      }

      if (!holiday) {
        totalWorkingDays++;
      }
    }
  }

  return {
    totalWorkingDays,
    leaveDays: Number(leaveDays.toFixed(2)),
    holidaysInPeriod
  };
};

// Get user statistics for dashboard with time period filter
exports.getUserStats = async (req, res) => {
  const userId = req.user.id;
  const { period = 'week' } = req.query; // 'week' or 'month'

  try {
    const pool = await getPool();


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



    res.status(200).json({
      period,
      totalHours: totalHours.toFixed(1),
      capacityUtilization,
      projectHours: totalHours.toFixed(1), // Same as totalHours since we exclude Admin
      leaveDays,
      effectiveWorkingDays: totalWorkingDays,
      targetHours,
      holidayDays: holidaysInPeriod.length,
      holidaysInPeriod: holidaysInPeriod.map(h => ({
        date: h.date,
        name: h.name
      })),
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