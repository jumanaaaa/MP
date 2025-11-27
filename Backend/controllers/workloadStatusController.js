const { sql, config } = require("../db");

/**
 * Calculate workload status for all users
 * 
 * Business Rules:
 * - Full year capacity: 180 man-days (assuming ~250 working days - 20% leave)
 * - Target utilization: 80% (144 man-days)
 * - Overworked: > 80% capacity (> 144 man-days)
 * - Underutilized: < 60% capacity (< 108 man-days)
 * - Optimal: 60-80% capacity (108-144 man-days)
 */

const WORKING_DAYS_PER_YEAR = 250; // Standard working days
const LEAVE_PERCENTAGE = 0.20; // 20% for leave
const AVAILABLE_DAYS = WORKING_DAYS_PER_YEAR * (1 - LEAVE_PERCENTAGE); // 200 days
const TARGET_CAPACITY = AVAILABLE_DAYS * 0.80; // 160 days (80% of 200)
const HOURS_PER_DAY = 8;

// Thresholds in hours
const OVERWORKED_THRESHOLD = TARGET_CAPACITY * HOURS_PER_DAY; // 1280 hours (160 days)
const UNDERUTILIZED_THRESHOLD = (AVAILABLE_DAYS * 0.60) * HOURS_PER_DAY; // 960 hours (120 days)

/**
 * Get workload status for all users
 */
exports.getWorkloadStatus = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    console.log('📊 Calculating workload status for all users...');
    
    await sql.connect(config);

    // Get all active users
    const usersResult = await sql.query(`
      SELECT 
        Id,
        FirstName,
        LastName,
        Email,
        Department,
        Role
      FROM Users
      WHERE Role IN ('admin', 'member')
      ORDER BY FirstName, LastName
    `);

    const users = usersResult.recordset;
    console.log(`👥 Found ${users.length} users`);

    // Get actuals for current year for all users
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1); // January 1st
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59); // December 31st

    console.log(`📅 Analyzing period: ${startOfYear.toISOString()} to ${endOfYear.toISOString()}`);

    const actualsResult = await sql.query`
      SELECT 
        UserId,
        Category,
        Project,
        Hours,
        StartDate,
        EndDate
      FROM Actuals
      WHERE StartDate >= ${startOfYear}
        AND EndDate <= ${endOfYear}
    `;

    const actuals = actualsResult.recordset;
    console.log(`📋 Found ${actuals.length} actual entries for current year`);

    // Calculate status for each user
    const userStatuses = users.map(user => {
      // Get all actuals for this user
      const userActuals = actuals.filter(a => a.UserId === user.Id);
      
      // Calculate total hours (including all categories: Project, Operations, Admin)
      const totalHours = userActuals.reduce((sum, actual) => {
        return sum + parseFloat(actual.Hours || 0);
      }, 0);

      // Calculate hours by category
      const projectHours = userActuals
        .filter(a => a.Category === 'Project')
        .reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0);
      
      const operationsHours = userActuals
        .filter(a => a.Category === 'Operations')
        .reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0);
      
      const adminHours = userActuals
        .filter(a => a.Category === 'Admin')
        .reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0);

      // Convert to man-days
      const totalManDays = (totalHours / HOURS_PER_DAY).toFixed(2);
      
      // Calculate utilization percentage
      const utilizationPercentage = ((totalHours / (AVAILABLE_DAYS * HOURS_PER_DAY)) * 100).toFixed(1);

      // Determine status
      let status;
      if (totalHours > OVERWORKED_THRESHOLD) {
        status = 'Overworked';
      } else if (totalHours < UNDERUTILIZED_THRESHOLD) {
        status = 'Underutilized';
      } else {
        status = 'Optimal';
      }

      console.log(`👤 ${user.FirstName} ${user.LastName}: ${totalHours}h (${totalManDays} days) = ${status}`);

      return {
        userId: user.Id,
        firstName: user.FirstName,
        lastName: user.LastName,
        email: user.Email,
        department: user.Department,
        role: user.Role,
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalManDays: parseFloat(totalManDays),
        projectHours: parseFloat(projectHours.toFixed(2)),
        operationsHours: parseFloat(operationsHours.toFixed(2)),
        adminHours: parseFloat(adminHours.toFixed(2)),
        utilizationPercentage: parseFloat(utilizationPercentage),
        status: status,
        actualEntriesCount: userActuals.length,
        thresholds: {
          overworked: OVERWORKED_THRESHOLD,
          underutilized: UNDERUTILIZED_THRESHOLD,
          target: TARGET_CAPACITY * HOURS_PER_DAY
        }
      };
    });

    // Calculate summary statistics
    const summary = {
      totalUsers: users.length,
      overworked: userStatuses.filter(u => u.status === 'Overworked').length,
      underutilized: userStatuses.filter(u => u.status === 'Underutilized').length,
      optimal: userStatuses.filter(u => u.status === 'Optimal').length,
      thresholds: {
        overworked: `> ${OVERWORKED_THRESHOLD} hours (> ${TARGET_CAPACITY} days)`,
        underutilized: `< ${UNDERUTILIZED_THRESHOLD} hours (< ${AVAILABLE_DAYS * 0.60} days)`,
        optimal: `${UNDERUTILIZED_THRESHOLD}-${OVERWORKED_THRESHOLD} hours (${AVAILABLE_DAYS * 0.60}-${TARGET_CAPACITY} days)`,
        yearlyCapacity: `${AVAILABLE_DAYS * HOURS_PER_DAY} hours (${AVAILABLE_DAYS} days available, 20% leave accounted for)`
      }
    };

    console.log('📊 Summary:', summary);

    res.status(200).json({
      success: true,
      year: currentYear,
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
    console.log(`📊 Calculating workload status for user ${userId}...`);

    await sql.connect(config);

    // Get user info
    const userResult = await sql.query`
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

    // Get actuals for current year
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const actualsResult = await sql.query`
      SELECT 
        Category,
        Project,
        Hours,
        StartDate,
        EndDate
      FROM Actuals
      WHERE UserId = ${userId}
        AND StartDate >= ${startOfYear}
        AND EndDate <= ${endOfYear}
    `;

    const actuals = actualsResult.recordset;

    // Calculate totals
    const totalHours = actuals.reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0);
    const totalManDays = (totalHours / HOURS_PER_DAY).toFixed(2);
    const utilizationPercentage = ((totalHours / (AVAILABLE_DAYS * HOURS_PER_DAY)) * 100).toFixed(1);

    // Determine status
    let status;
    if (totalHours > OVERWORKED_THRESHOLD) {
      status = 'Overworked';
    } else if (totalHours < UNDERUTILIZED_THRESHOLD) {
      status = 'Underutilized';
    } else {
      status = 'Optimal';
    }

    res.status(200).json({
      success: true,
      year: currentYear,
      user: {
        userId: user.Id,
        firstName: user.FirstName,
        lastName: user.LastName,
        email: user.Email,
        department: user.Department,
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalManDays: parseFloat(totalManDays),
        utilizationPercentage: parseFloat(utilizationPercentage),
        status: status
      },
      thresholds: {
        overworked: `> ${OVERWORKED_THRESHOLD} hours`,
        underutilized: `< ${UNDERUTILIZED_THRESHOLD} hours`,
        optimal: `${UNDERUTILIZED_THRESHOLD}-${OVERWORKED_THRESHOLD} hours`
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