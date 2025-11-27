const axios = require("axios");
const { sql, config } = require("../db");
const { getValidManicTimeToken } = require("../middleware/manictimeauth");

// Hardcoded device timeline mappings
const DEVICE_SUMMARY_TIMELINES = [
  { deviceName: "IHRP-JUMHA-227", timelineKey: "97c86719-8d5b-4378-874e-f43c260f8736" },
  { deviceName: "IHRP-WLT-061 (1)", timelineKey: "1aaffcc9-faa0-460b-8ee4-bb44ac85d92c" },
];

/**
 * Get user's reports comparing Actuals vs ManicTime
 * Date range can be: today, week, month, or custom range
 */
exports.getUserReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fromDate, toDate } = req.query;

    console.log(`📊 Fetching reports for user ${userId}`);
    console.log(`📅 Date range: ${fromDate} to ${toDate}`);

    await sql.connect(config);

    // Get user's device name
    const userResult = await sql.query`
      SELECT DeviceName, FirstName, LastName, Email
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
    const deviceName = user.DeviceName;

    if (!deviceName) {
      return res.status(400).json({
        success: false,
        message: 'No device name assigned to user. Please contact administrator.'
      });
    }

    console.log(`🖥️ User device: ${deviceName}`);

    // Find timeline key for this device
    const deviceConfig = DEVICE_SUMMARY_TIMELINES.find(
      d => d.deviceName === deviceName
    );

    if (!deviceConfig) {
      return res.status(400).json({
        success: false,
        message: `Device "${deviceName}" not configured in ManicTime. Available devices: ${DEVICE_SUMMARY_TIMELINES.map(d => d.deviceName).join(', ')}`
      });
    }

    console.log(`🔑 Timeline key: ${deviceConfig.timelineKey}`);

    // Parse dates
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);

    const formattedFrom = startDate.toISOString();
    const formattedTo = endDate.toISOString();

    // ========================================
    // 1. FETCH ACTUALS DATA
    // ========================================
    const actualsResult = await sql.query`
      SELECT 
        Category,
        Project,
        Hours,
        StartDate,
        EndDate
      FROM Actuals
      WHERE UserId = ${userId}
        AND StartDate >= ${startDate}
        AND EndDate <= ${endDate}
      ORDER BY StartDate
    `;

    const actuals = actualsResult.recordset;
    console.log(`📋 Found ${actuals.length} actual entries`);

    // Calculate actuals totals
    const actualsTotal = actuals.reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0);
    
    const actualsByCategory = {
      Project: actuals.filter(a => a.Category === 'Project').reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0),
      Operations: actuals.filter(a => a.Category === 'Operations').reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0),
      Admin: actuals.filter(a => a.Category === 'Admin').reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0)
    };

    // Group by day for daily breakdown
    const actualsByDay = {};
    actuals.forEach(actual => {
      const dayKey = new Date(actual.StartDate).toISOString().split('T')[0];
      if (!actualsByDay[dayKey]) {
        actualsByDay[dayKey] = 0;
      }
      actualsByDay[dayKey] += parseFloat(actual.Hours || 0);
    });

    // ========================================
    // 2. FETCH MANICTIME DATA
    // ========================================
    const token = await getValidManicTimeToken();
    
    const url = 
      `${process.env.MANICTIME_URL}/${process.env.MANICTIME_WORKSPACE_ID}/api/timelines/${deviceConfig.timelineKey}/activities` +
      `?fromTime=${formattedFrom}&toTime=${formattedTo}`;

    console.log(`📡 Fetching ManicTime data...`);

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.manictime.v3+json"
      }
    });

    const entities = response.data.entities || [];
    console.log(`⏱️ Found ${entities.length} ManicTime activities`);

    // Calculate ManicTime totals (duration is in seconds)
    let manicTimeTotal = 0;
    const manicTimeByDay = {};
    const manicTimeActivities = [];

    entities.forEach(entity => {
      if (entity.entityType !== "activity") return;
      
      const { name, timeInterval } = entity.values;
      if (!name || !name.trim()) return;

      const duration = parseInt(timeInterval.duration, 10); // seconds
      const hours = duration / 3600; // convert to hours
      const activityDate = new Date(timeInterval.start);
      const dayKey = activityDate.toISOString().split('T')[0];

      manicTimeTotal += hours;

      if (!manicTimeByDay[dayKey]) {
        manicTimeByDay[dayKey] = 0;
      }
      manicTimeByDay[dayKey] += hours;

      manicTimeActivities.push({
        name,
        date: activityDate,
        duration: duration,
        hours: hours
      });
    });

    console.log(`✅ ManicTime total: ${manicTimeTotal.toFixed(2)} hours`);
    console.log(`✅ Actuals total: ${actualsTotal.toFixed(2)} hours`);

    // ========================================
    // 3. CALCULATE COMPARISON METRICS
    // ========================================
    const difference = actualsTotal - manicTimeTotal;
    const discrepancyPercentage = manicTimeTotal > 0 
      ? ((difference / manicTimeTotal) * 100).toFixed(1)
      : 0;

    // Calculate accuracy (how close actuals are to ManicTime)
    const accuracy = manicTimeTotal > 0
      ? Math.max(0, 100 - Math.abs(discrepancyPercentage))
      : 0;

    // ========================================
    // 4. DAILY BREAKDOWN
    // ========================================
    const allDays = new Set([
      ...Object.keys(actualsByDay),
      ...Object.keys(manicTimeByDay)
    ]);

    const dailyBreakdown = Array.from(allDays).sort().map(day => ({
      date: day,
      actuals: actualsByDay[day] || 0,
      manicTime: manicTimeByDay[day] || 0,
      difference: (actualsByDay[day] || 0) - (manicTimeByDay[day] || 0)
    }));

    // ========================================
    // 5. RETURN COMPREHENSIVE REPORT
    // ========================================
    const report = {
      success: true,
      user: {
        id: userId,
        name: `${user.FirstName} ${user.LastName}`,
        email: user.Email,
        deviceName: deviceName
      },
      dateRange: {
        from: fromDate,
        to: toDate,
        days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
      },
      summary: {
        actualsTotal: parseFloat(actualsTotal.toFixed(2)),
        manicTimeTotal: parseFloat(manicTimeTotal.toFixed(2)),
        difference: parseFloat(difference.toFixed(2)),
        discrepancyPercentage: parseFloat(discrepancyPercentage),
        accuracy: parseFloat(accuracy.toFixed(1)),
        status: Math.abs(difference) < 2 ? 'Accurate' : 
                Math.abs(difference) < 5 ? 'Minor Discrepancy' : 
                'Significant Discrepancy'
      },
      actuals: {
        total: parseFloat(actualsTotal.toFixed(2)),
        byCategory: {
          Project: parseFloat(actualsByCategory.Project.toFixed(2)),
          Operations: parseFloat(actualsByCategory.Operations.toFixed(2)),
          Admin: parseFloat(actualsByCategory.Admin.toFixed(2))
        },
        entries: actuals.map(a => ({
          category: a.Category,
          project: a.Project,
          hours: parseFloat(a.Hours),
          startDate: a.StartDate,
          endDate: a.EndDate
        }))
      },
      manicTime: {
        total: parseFloat(manicTimeTotal.toFixed(2)),
        activitiesCount: manicTimeActivities.length,
        topActivities: manicTimeActivities
          .sort((a, b) => b.hours - a.hours)
          .slice(0, 10)
          .map(a => ({
            name: a.name,
            hours: parseFloat(a.hours.toFixed(2)),
            date: a.date
          }))
      },
      dailyBreakdown: dailyBreakdown.map(day => ({
        ...day,
        actuals: parseFloat(day.actuals.toFixed(2)),
        manicTime: parseFloat(day.manicTime.toFixed(2)),
        difference: parseFloat(day.difference.toFixed(2))
      }))
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