const { sql, config } = require("../db");

// Create Actual Entry
exports.createActual = async (req, res) => {
  const { category, project, startDate, endDate, hours } = req.body;

  if (!category || !startDate || !endDate || !hours) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    await sql.connect(config);
    const request = new sql.Request();

    request.input("Category", sql.NVarChar, category);
    request.input("Project", sql.NVarChar, project || null);
    request.input("StartDate", sql.Date, startDate);
    request.input("EndDate", sql.Date, endDate);
    request.input("Hours", sql.Decimal(5, 2), hours);

    await request.query(`
      INSERT INTO Actuals (Category, Project, StartDate, EndDate, Hours)
      VALUES (@Category, @Project, @StartDate, @EndDate, @Hours)
    `);

    res.status(201).json({ message: "Actual entry added successfully" });
  } catch (err) {
    console.error("Create Actual Error:", err);
    res.status(500).json({ message: "Failed to add actual entry" });
  }
};

// Get All Actual Entries
exports.getActuals = async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT * FROM Actuals ORDER BY CreatedAt DESC
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Get Actuals Error:", err);
    res.status(500).json({ message: "Failed to fetch actual entries" });
  }
};
