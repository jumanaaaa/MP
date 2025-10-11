const { sql, config } = require("../db");

// ===================== CREATE =====================
exports.createIndividualPlan = async (req, res) => {
  const { project, role, startDate, endDate, fields } = req.body;
  const userId = req.user.id; // ← Get userId from JWT token

  if (!project || !startDate || !endDate) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    await sql.connect(config);
    const request = new sql.Request();

    const fieldsJson = JSON.stringify(fields || {});

    request.input("Project", sql.NVarChar, project);
    request.input("Role", sql.NVarChar, role || null);
    request.input("StartDate", sql.Date, startDate);
    request.input("EndDate", sql.Date, endDate);
    request.input("Fields", sql.NVarChar(sql.MAX), fieldsJson);
    request.input("UserId", sql.Int, userId); // ← Add userId

    await request.query(`
      INSERT INTO IndividualPlan (Project, Role, StartDate, EndDate, Fields, UserId)
      VALUES (@Project, @Role, @StartDate, @EndDate, @Fields, @UserId)
    `);

    res.status(201).json({ message: "Individual Plan created successfully" });
  } catch (err) {
    console.error("Create Individual Plan Error:", err);
    res.status(500).json({ message: "Failed to create individual plan" });
  }
};

// ===================== READ =====================
exports.getIndividualPlans = async (req, res) => {
  const userId = req.user.id; // ← Get userId from JWT token

  try {
    await sql.connect(config);
    const request = new sql.Request();
    request.input("UserId", sql.Int, userId); // ← Add userId parameter

    const result = await request.query(`
      SELECT Id, Project, Role, StartDate, EndDate, Fields, CreatedAt
      FROM IndividualPlan
      WHERE UserId = @UserId  -- ← Filter by userId
      ORDER BY CreatedAt DESC
    `);

    const plans = result.recordset.map((plan) => ({
      ...plan,
      Fields: JSON.parse(plan.Fields || "{}"),
    }));

    res.status(200).json(plans);
  } catch (err) {
    console.error("Get Individual Plans Error:", err);
    res.status(500).json({ message: "Failed to fetch individual plans" });
  }
};

// ===================== UPDATE =====================
exports.updateIndividualPlan = async (req, res) => {
  const { id } = req.params;
  const { project, role, startDate, endDate, fields } = req.body;
  const userId = req.user.id; // ← Get userId from JWT token

  try {
    await sql.connect(config);
    
    // First, check if the plan exists and belongs to the current user
    const checkRequest = new sql.Request();
    checkRequest.input("Id", sql.Int, id);
    checkRequest.input("UserId", sql.Int, userId);
    
    const checkResult = await checkRequest.query(`
      SELECT Id FROM IndividualPlan 
      WHERE Id = @Id AND UserId = @UserId
    `);
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ 
        message: "Plan not found or you don't have permission to edit it" 
      });
    }
    
    // If ownership verified, proceed with update
    const request = new sql.Request();
    const fieldsJson = JSON.stringify(fields || {});

    request.input("Id", sql.Int, id);
    request.input("Project", sql.NVarChar, project);
    request.input("Role", sql.NVarChar, role || null);
    request.input("StartDate", sql.Date, startDate);
    request.input("EndDate", sql.Date, endDate);
    request.input("Fields", sql.NVarChar(sql.MAX), fieldsJson);
    request.input("UserId", sql.Int, userId); // ← Add userId

    await request.query(`
      UPDATE IndividualPlan
      SET Project = @Project,
          Role = @Role,
          StartDate = @StartDate,
          EndDate = @EndDate,
          Fields = @Fields
      WHERE Id = @Id AND UserId = @UserId  -- ← Verify ownership
    `);

    res.status(200).json({ message: "Individual Plan updated successfully" });
  } catch (err) {
    console.error("Update Individual Plan Error:", err);
    res.status(500).json({ message: "Failed to update individual plan" });
  }
};

// ===================== DELETE (NOT EXPOSED IN ROUTES) =====================
// Keeping this here but commented out since you don't want delete functionality
exports.deleteIndividualPlan = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    await sql.connect(config);
    const request = new sql.Request();
    request.input("Id", sql.Int, id);
    request.input("UserId", sql.Int, userId);

    // Only allow deletion if user owns the plan
    const result = await request.query(`
      DELETE FROM IndividualPlan 
      WHERE Id = @Id AND UserId = @UserId
    `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ 
        message: "Plan not found or you don't have permission to delete it" 
      });
    }

    res.status(200).json({ message: "Individual Plan deleted successfully" });
  } catch (err) {
    console.error("Delete Individual Plan Error:", err);
    res.status(500).json({ message: "Failed to delete individual plan" });
  }
};