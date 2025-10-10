// const { sql, config } = require("../db");

// // Create Individual Plan
// exports.createIndividualPlan = async (req, res) => {
//   const { project, role, startDate, endDate, fields } = req.body;

//   if (!project || !startDate || !endDate) {
//     return res.status(400).json({ message: "Missing required fields" });
//   }

//   try {
//     await sql.connect(config);
//     const request = new sql.Request();

//     const fieldsJson = JSON.stringify(fields || {});

//     request.input("Project", sql.NVarChar, project);
//     request.input("Role", sql.NVarChar, role || null);
//     request.input("StartDate", sql.Date, startDate);
//     request.input("EndDate", sql.Date, endDate);
//     request.input("Fields", sql.NVarChar(sql.MAX), fieldsJson);

//     await request.query(`
//       INSERT INTO IndividualPlan (Project, Role, StartDate, EndDate, Fields)
//       VALUES (@Project, @Role, @StartDate, @EndDate, @Fields)
//     `);

//     res.status(201).json({ message: "Individual Plan created successfully" });
//   } catch (err) {
//     console.error("Create Individual Plan Error:", err);
//     res.status(500).json({ message: "Failed to create individual plan" });
//   }
// };
// const { sql, config } = require("../db");

// // Create Individual Plan
// exports.createIndividualPlan = async (req, res) => {
//   const { project, role, startDate, endDate, fields } = req.body;

//   if (!project || !startDate || !endDate) {
//     return res.status(400).json({ message: "Missing required fields" });
//   }

//   try {
//     await sql.connect(config);
//     const request = new sql.Request();

//     const fieldsJson = JSON.stringify(fields || {});

//     request.input("Project", sql.NVarChar, project);
//     request.input("Role", sql.NVarChar, role || null);
//     request.input("StartDate", sql.Date, startDate);
//     request.input("EndDate", sql.Date, endDate);
//     request.input("Fields", sql.NVarChar(sql.MAX), fieldsJson);

//     await request.query(`
//       INSERT INTO IndividualPlan (Project, Role, StartDate, EndDate, Fields)
//       VALUES (@Project, @Role, @StartDate, @EndDate, @Fields)
//     `);

//     res.status(201).json({ message: "Individual Plan created successfully" });
//   } catch (err) {
//     console.error("Create Individual Plan Error:", err);
//     res.status(500).json({ message: "Failed to create individual plan" });
//   }
// };

// // Get All Individual Plans
// exports.getIndividualPlans = async (req, res) => {
//   try {
//     await sql.connect(config);
//     const result = await sql.query(`
//       SELECT Id, Project, Role, StartDate, EndDate, Fields, CreatedAt
//       FROM IndividualPlan
//       ORDER BY Id DESC
//     `);

//     const plans = result.recordset.map(plan => ({
//       ...plan,
//       Fields: JSON.parse(plan.Fields || "{}")
//     }));

//     res.status(200).json(plans);
//   } catch (err) {
//     console.error("Get Individual Plans Error:", err);
//     res.status(500).json({ message: "Failed to fetch individual plans" });
//   }
// };



// const { sql, config } = require("../db");

// // Create Individual Plan
// exports.createIndividualPlan = async (req, res) => {
//   const { project, role, startDate, endDate, fields } = req.body;

//   if (!project || !startDate || !endDate) {
//     return res.status(400).json({ message: "Missing required fields" });
//   }

//   try {
//     await sql.connect(config);
//     const request = new sql.Request();

//     const fieldsJson = JSON.stringify(fields || {});

//     request.input("Project", sql.NVarChar, project);
//     request.input("Role", sql.NVarChar, role || null);
//     request.input("StartDate", sql.Date, startDate);
//     request.input("EndDate", sql.Date, endDate);
//     request.input("Fields", sql.NVarChar(sql.MAX), fieldsJson);

//     await request.query(`
//       INSERT INTO IndividualPlan (Project, Role, StartDate, EndDate, Fields)
//       VALUES (@Project, @Role, @StartDate, @EndDate, @Fields)
//     `);

//     res.status(201).json({ message: "Individual Plan created successfully" });
//   } catch (err) {
//     console.error("Create Individual Plan Error:", err);
//     res.status(500).json({ message: "Failed to create individual plan" });
//   }
// };

// // Get All Individual Plans
// exports.getIndividualPlans = async (req, res) => {
//   try {
//     await sql.connect(config);
//     const result = await sql.query(`
//       SELECT Id, Project, Role, StartDate, EndDate, Fields, CreatedAt
//       FROM IndividualPlan
//       ORDER BY Id DESC
//     `);

//     const plans = result.recordset.map(plan => ({
//       ...plan,
//       Fields: JSON.parse(plan.Fields || "{}")
//     }));

//     res.status(200).json(plans);
//   } catch (err) {
//     console.error("Get Individual Plans Error:", err);
//     res.status(500).json({ message: "Failed to fetch individual plans" });
//   }
// };


const { sql, config } = require("../db");

// ===================== CREATE =====================
exports.createIndividualPlan = async (req, res) => {
  const { project, role, startDate, endDate, fields } = req.body;

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

    await request.query(`
      INSERT INTO IndividualPlan (Project, Role, StartDate, EndDate, Fields)
      VALUES (@Project, @Role, @StartDate, @EndDate, @Fields)
    `);

    res.status(201).json({ message: "Individual Plan created successfully" });
  } catch (err) {
    console.error("Create Individual Plan Error:", err);
    res.status(500).json({ message: "Failed to create individual plan" });
  }
};

// ===================== READ =====================
exports.getIndividualPlans = async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT Id, Project, Role, StartDate, EndDate, Fields, CreatedAt
      FROM IndividualPlan
      ORDER BY Id DESC
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

  try {
    await sql.connect(config);
    const request = new sql.Request();

    const fieldsJson = JSON.stringify(fields || {});

    request.input("Id", sql.Int, id);
    request.input("Project", sql.NVarChar, project);
    request.input("Role", sql.NVarChar, role || null);
    request.input("StartDate", sql.Date, startDate);
    request.input("EndDate", sql.Date, endDate);
    request.input("Fields", sql.NVarChar(sql.MAX), fieldsJson);

    await request.query(`
      UPDATE IndividualPlan
      SET Project = @Project,
          Role = @Role,
          StartDate = @StartDate,
          EndDate = @EndDate,
          Fields = @Fields
      WHERE Id = @Id
    `);

    res.status(200).json({ message: "Individual Plan updated successfully" });
  } catch (err) {
    console.error("Update Individual Plan Error:", err);
    res.status(500).json({ message: "Failed to update individual plan" });
  }
};

// ===================== DELETE =====================
exports.deleteIndividualPlan = async (req, res) => {
  const { id } = req.params;

  try {
    await sql.connect(config);
    const request = new sql.Request();
    request.input("Id", sql.Int, id);

    await request.query(`DELETE FROM IndividualPlan WHERE Id = @Id`);

    res.status(200).json({ message: "Individual Plan deleted successfully" });
  } catch (err) {
    console.error("Delete Individual Plan Error:", err);
    res.status(500).json({ message: "Failed to delete individual plan" });
  }
};
