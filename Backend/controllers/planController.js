// const { sql, config } = require("../db");

// // === Create a new Master Plan ===
// exports.createMasterPlan = async (req, res) => {
//   const { project, startDate, endDate, fields } = req.body;

//   if (!project || !startDate || !endDate) {
//     return res.status(400).json({ message: "Missing required fields" });
//   }

//   try {
//     await sql.connect(config);
//     const request = new sql.Request();

//     request.input("Project", sql.NVarChar, project);
//     request.input("StartDate", sql.Date, startDate);
//     request.input("EndDate", sql.Date, endDate);
//     request.input("Fields", sql.NVarChar, JSON.stringify(fields || {}));

//     const query = `
//       INSERT INTO MasterPlan (Project, StartDate, EndDate, Fields)
//       VALUES (@Project, @StartDate, @EndDate, @Fields)
//     `;

//     await request.query(query);
//     res.status(201).json({ message: "Master Plan created successfully!" });
//   } catch (err) {
//     console.error("Create Master Plan Error:", err);
//     res.status(500).json({ message: "Failed to create Master Plan" });
//   }
// };

// // === Get all Master Plans ===
// exports.getMasterPlans = async (req, res) => {
//   try {
//     await sql.connect(config);
//     const request = new sql.Request();
//     const result = await request.query(`SELECT * FROM MasterPlan ORDER BY Id DESC`);
//     res.status(200).json(result.recordset);
//   } catch (err) {
//     console.error("Get Master Plans Error:", err);
//     res.status(500).json({ message: "Failed to fetch Master Plans" });
//   }
// };



const { sql, config } = require("../db");

// Create new Master Plan (with dynamic fields)
exports.createMasterPlan = async (req, res) => {
  const { project, startDate, endDate, fields } = req.body;

  if (!project || !startDate || !endDate) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    await sql.connect(config);
    const transaction = new sql.Transaction();

    await transaction.begin();

    // Insert into MasterPlans
    const planRequest = new sql.Request(transaction);
    planRequest.input("Project", sql.NVarChar, project);
    planRequest.input("StartDate", sql.Date, startDate);
    planRequest.input("EndDate", sql.Date, endDate);

    const planResult = await planRequest.query(`
      INSERT INTO MasterPlans (Project, StartDate, EndDate)
      OUTPUT INSERTED.Id
      VALUES (@Project, @StartDate, @EndDate)
    `);

    const masterPlanId = planResult.recordset[0].Id;

    // Insert each field dynamically into MasterPlanFields
    if (fields && typeof fields === "object") {
      const fieldEntries = Object.entries(fields);
      for (const [fieldName, fieldValue] of fieldEntries) {
        const fieldRequest = new sql.Request(transaction);
        fieldRequest.input("MasterPlanId", sql.Int, masterPlanId);
        fieldRequest.input("FieldName", sql.NVarChar, fieldName);
        fieldRequest.input("FieldValue", sql.NVarChar, fieldValue || "");

        await fieldRequest.query(`
          INSERT INTO MasterPlanFields (MasterPlanId, FieldName, FieldValue)
          VALUES (@MasterPlanId, @FieldName, @FieldValue)
        `);
      }
    }

    await transaction.commit();
    res.status(201).json({ message: "Master Plan created successfully!" });
  } catch (err) {
    console.error("Create Master Plan Error:", err);
    res.status(500).json({ message: "Failed to create master plan" });
  }
};

// Retrieve all master plans with their fields
exports.getMasterPlans = async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT mp.Id, mp.Project, mp.StartDate, mp.EndDate, mp.CreatedAt,
             f.FieldName, f.FieldValue
      FROM MasterPlans mp
      LEFT JOIN MasterPlanFields f ON mp.Id = f.MasterPlanId
      ORDER BY mp.Id DESC
    `);

    // Group fields under each plan
    const plans = {};
    for (const row of result.recordset) {
      if (!plans[row.Id]) {
        plans[row.Id] = {
          id: row.Id,
          project: row.Project,
          startDate: row.StartDate,
          endDate: row.EndDate,
          createdAt: row.CreatedAt,
          fields: {},
        };
      }
      if (row.FieldName) {
        plans[row.Id].fields[row.FieldName] = row.FieldValue;
      }
    }

    res.status(200).json(Object.values(plans));
  } catch (err) {
    console.error("Get Master Plans Error:", err);
    res.status(500).json({ message: "Failed to fetch master plans" });
  }
};
