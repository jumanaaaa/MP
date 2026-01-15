const { sql, getPool } = require("../db/pool");

// ===================== GET WEEK'S ALLOCATIONS =====================
exports.getWeeklyAllocations = async (req, res) => {
  const { weekStart } = req.query;
  const userId = req.user.id;

  if (!weekStart) {
    return res.status(400).json({ message: "Missing weekStart parameter" });
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input("UserId", sql.Int, userId);
    request.input("WeekStart", sql.Date, weekStart);

    const result = await request.query(`
      SELECT 
        wa.Id,
        wa.IndividualPlanId,
        wa.ProjectName,
        wa.ProjectType,
        wa.WeekStart,
        wa.WeekEnd,
        wa.PlannedHours,
        wa.Tasks,
        wa.Status,
        wa.Notes,
        wa.AiGenerated
      FROM WeeklyAllocation wa
      WHERE wa.UserId = @UserId 
        AND wa.WeekStart = @WeekStart
      ORDER BY wa.PlannedHours DESC
    `);

    const allocations = result.recordset.map(row => ({
      ...row,
      Tasks: JSON.parse(row.Tasks || '[]')
    }));

    res.status(200).json(allocations);
  } catch (err) {
    console.error("Get Weekly Allocations Error:", err);
    res.status(500).json({ message: "Failed to fetch weekly allocations" });
  }
};

// ===================== SAVE/UPDATE WEEKLY ALLOCATION =====================
exports.saveWeeklyAllocation = async (req, res) => {
  const { 
    individualPlanId, 
    projectName, 
    projectType, 
    weekStart, 
    weekEnd, 
    plannedHours, 
    tasks, 
    notes,
    aiGenerated 
  } = req.body;
  const userId = req.user.id;

  if (!projectName || !weekStart || !weekEnd || plannedHours === undefined) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Validate week is Monday-Friday
  const start = new Date(weekStart);
  const end = new Date(weekEnd);

  if (end < start) {
    return res.status(400).json({
      message: "End date must be after start date"
    });
  }

  try {
    const pool = await getPool();
    
    // Check if allocation already exists
    const checkRequest = pool.request();
    checkRequest.input("UserId", sql.Int, userId);
    checkRequest.input("ProjectName", sql.NVarChar, projectName);
    checkRequest.input("WeekStart", sql.Date, weekStart);

    // Build query with proper NULL handling for individualPlanId
    let checkQuery = `
      SELECT Id FROM WeeklyAllocation
      WHERE UserId = @UserId 
        AND ProjectName = @ProjectName
        AND WeekStart = @WeekStart
    `;

    if (individualPlanId !== null && individualPlanId !== undefined) {
      checkRequest.input("IndividualPlanId", sql.Int, individualPlanId);
      checkQuery += ` AND IndividualPlanId = @IndividualPlanId`;
    } else {
      checkQuery += ` AND IndividualPlanId IS NULL`;
    }

    const existing = await checkRequest.query(checkQuery);

    const tasksJson = JSON.stringify(tasks || []);

    if (existing.recordset.length > 0) {
      // UPDATE existing allocation
      const updateRequest = pool.request();
      updateRequest.input("Id", sql.Int, existing.recordset[0].Id);
      updateRequest.input("PlannedHours", sql.Decimal(5, 2), plannedHours);
      updateRequest.input("Tasks", sql.NVarChar(sql.MAX), tasksJson);
      updateRequest.input("Notes", sql.NVarChar(sql.MAX), notes || null);

      await updateRequest.query(`
        UPDATE WeeklyAllocation
        SET PlannedHours = @PlannedHours,
            Tasks = @Tasks,
            Notes = @Notes,
            UpdatedAt = GETDATE()
        WHERE Id = @Id
      `);

      res.status(200).json({ message: "Weekly allocation updated" });
    } else {
      // INSERT new allocation
      const insertRequest = pool.request();
      insertRequest.input("UserId", sql.Int, userId);
      insertRequest.input("ProjectName", sql.NVarChar, projectName);
      insertRequest.input("ProjectType", sql.NVarChar, projectType);
      insertRequest.input("WeekStart", sql.Date, weekStart);
      insertRequest.input("WeekEnd", sql.Date, weekEnd);
      insertRequest.input("PlannedHours", sql.Decimal(5, 2), plannedHours);
      insertRequest.input("Tasks", sql.NVarChar(sql.MAX), tasksJson);
      insertRequest.input("Notes", sql.NVarChar(sql.MAX), notes || null);
      insertRequest.input("AiGenerated", sql.Bit, aiGenerated || false);

      // Handle NULL individualPlanId
      if (individualPlanId !== null && individualPlanId !== undefined) {
        insertRequest.input("IndividualPlanId", sql.Int, individualPlanId);
      } else {
        insertRequest.input("IndividualPlanId", sql.Int, null);
      }

      await insertRequest.query(`
        INSERT INTO WeeklyAllocation
          (UserId, IndividualPlanId, ProjectName, ProjectType, WeekStart, WeekEnd, 
           PlannedHours, Tasks, Notes, AiGenerated)
        VALUES
          (@UserId, @IndividualPlanId, @ProjectName, @ProjectType, @WeekStart, @WeekEnd,
           @PlannedHours, @Tasks, @Notes, @AiGenerated)
      `);

      res.status(201).json({ message: "Weekly allocation created" });
    }
  } catch (err) {
    console.error("Save Weekly Allocation Error:", err);
    console.error("Error details:", err.message);
    res.status(500).json({ 
      message: "Failed to save weekly allocation",
      error: err.message
    });
  }
};

exports.updateWeeklyAllocation = async (req, res) => {
  const { id } = req.params;
  const { 
    weekStart, 
    weekEnd, 
    plannedHours, 
    tasks, 
    notes,
    status 
  } = req.body;
  
  const userId = req.user.id;

  try {
    const pool = await getPool();
    
    // First, check ownership
    const checkRequest = pool.request();
    checkRequest.input("Id", sql.Int, id);
    checkRequest.input("UserId", sql.Int, userId);
    
    const checkResult = await checkRequest.query(`
      SELECT Id FROM WeeklyAllocation 
      WHERE Id = @Id AND UserId = @UserId
    `);
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ 
        message: "Weekly allocation not found or you don't have permission to edit it" 
      });
    }
    
    // Proceed with update
    const request = pool.request();
    const tasksJson = JSON.stringify(tasks || []);

    request.input("Id", sql.Int, id);
    request.input("UserId", sql.Int, userId);
    request.input("WeekStart", sql.Date, weekStart);
    request.input("WeekEnd", sql.Date, weekEnd);
    request.input("PlannedHours", sql.Decimal(5, 2), plannedHours);
    request.input("Tasks", sql.NVarChar(sql.MAX), tasksJson);
    request.input("Notes", sql.NVarChar(sql.MAX), notes || '');
    request.input("Status", sql.NVarChar(50), status || 'Planned');

    await request.query(`
      UPDATE WeeklyAllocation
      SET WeekStart = @WeekStart,
          WeekEnd = @WeekEnd,
          PlannedHours = @PlannedHours,
          Tasks = @Tasks,
          Notes = @Notes,
          Status = @Status,
          UpdatedAt = GETDATE()
      WHERE Id = @Id AND UserId = @UserId
    `);

    res.status(200).json({ message: "Weekly allocation updated successfully" });
  } catch (err) {
    console.error("Update Weekly Allocation Error:", err);
    res.status(500).json({ message: "Failed to update weekly allocation" });
  }
};

// ===================== UPDATE STATUS =====================
exports.updateAllocationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  if (!['Planned', 'In Progress', 'Completed'].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input("Id", sql.Int, id);
    request.input("UserId", sql.Int, userId);
    request.input("Status", sql.NVarChar, status);

    const result = await request.query(`
      UPDATE WeeklyAllocation
      SET Status = @Status, UpdatedAt = GETDATE()
      WHERE Id = @Id AND UserId = @UserId
    `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Allocation not found" });
    }

    res.status(200).json({ message: "Status updated successfully" });
  } catch (err) {
    console.error("Update Allocation Status Error:", err);
    res.status(500).json({ message: "Failed to update status" });
  }
};

// ===================== GET ALL ALLOCATIONS (TIMELINE) =====================
exports.getAllAllocations = async (req, res) => {
  const userId = req.user.id;

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input("UserId", sql.Int, userId);

    const result = await request.query(`
      SELECT 
        wa.Id,
        wa.IndividualPlanId,
        wa.ProjectName,
        wa.ProjectType,
        wa.WeekStart,
        wa.WeekEnd,
        wa.PlannedHours,
        wa.Tasks,
        wa.Status,
        wa.Notes,
        wa.CreatedAt
      FROM WeeklyAllocation wa
      WHERE wa.UserId = @UserId
      ORDER BY wa.WeekStart DESC
    `);

    const allocations = result.recordset.map(row => ({
      ...row,
      Tasks: JSON.parse(row.Tasks || '[]')
    }));

    res.status(200).json(allocations);
  } catch (err) {
    console.error("Get All Allocations Error:", err);
    res.status(500).json({ message: "Failed to fetch allocations" });
  }
};

// ===================== GET SUPERVISED WEEKLY ALLOCATIONS =====================
exports.getSupervisedAllocations = async (req, res) => {
  const supervisorId = req.user.id;

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input("SupervisorId", sql.Int, supervisorId);

    const result = await request.query(`
      SELECT 
        wa.Id,
        wa.UserId,
        wa.IndividualPlanId,
        wa.ProjectName,
        wa.ProjectType,
        wa.WeekStart,
        wa.WeekEnd,
        wa.PlannedHours,
        wa.Tasks,
        wa.Status,
        wa.Notes,
        wa.CreatedAt,
        u.FirstName,
        u.LastName
      FROM WeeklyAllocation wa
      INNER JOIN Users u ON wa.UserId = u.Id
      WHERE u.AssignedUnder = @SupervisorId  -- ✅ Matches your Users.AssignedUnder field
      ORDER BY wa.WeekStart DESC
    `);

    const allocations = result.recordset.map(row => ({
      ...row,
      Tasks: JSON.parse(row.Tasks || '[]'),
      ownerName: `${row.FirstName} ${row.LastName}`
    }));

    res.status(200).json(allocations);
  } catch (err) {
    console.error("Get Supervised Allocations Error:", err);
    res.status(500).json({ message: "Failed to fetch supervised allocations" });
  }
};

// ===================== DELETE ALLOCATION =====================
exports.deleteWeeklyAllocation = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input("Id", sql.Int, id);
    request.input("UserId", sql.Int, userId);

    const result = await request.query(`
      DELETE FROM WeeklyAllocation
      WHERE Id = @Id AND UserId = @UserId
    `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Allocation not found" });
    }

    res.status(200).json({ message: "Weekly allocation deleted" });
  } catch (err) {
    console.error("Delete Weekly Allocation Error:", err);
    res.status(500).json({ message: "Failed to delete allocation" });
  }
};