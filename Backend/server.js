// === server.js ===
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { sql, config } = require("./db");
const msal = require("@azure/msal-node");

// === ManicTime Token Auto-Refresh ===
const cron = require("node-cron");
const { getValidManicTimeToken } = require("./middleware/manictimeauth");

// === ENTRA ID (MICROSOFT LOGIN) ===
const msalConfig = {
  auth: {
    clientId: process.env.MS_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}`,
    clientSecret: process.env.MS_CLIENT_SECRET
  }
};

const msalClient = new msal.ConfidentialClientApplication(msalConfig);

const MS_REDIRECT_URI = "http://localhost:3000/auth/ms-callback";

// // === Auto-Fetch ManicTime Summary Every Hour ===
const { fetchSummaryData } = require("./controllers/manictimeController");

// ===============================
//  MANICTIME AUTO REFRESH (TOKEN)
// ===============================
cron.schedule("*/50 * * * *", async () => {
  console.log("🔄 Auto-refreshing ManicTime token...");
  try {
    await getValidManicTimeToken();
  } catch (err) {
    console.error("⚠️ Auto-refresh failed:", err.message);
  }
});


// ===============================
//  MANICTIME SUMMARY CRON (SAFE)
// ===============================
cron.schedule("0 * * * *", async () => {
  console.log("🕒 [CRON] Fetching ManicTime summary...");
  try {
    await fetchSummaryData(null, null); // CRON MODE (no req/res)
    console.log("✅ [CRON] Summary fetched successfully");
  } catch (err) {
    console.error("❌ [CRON] Summary fetch failed:", err.message);
  }
});

const app = express();

// === Middleware ===
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5173", // Your frontend dev server
  credentials: true // Allow cookies
}));

// === Import Auth Middleware ===
const verifyToken = require("./middleware/auth");

// === SIGNUP Route ===
app.post("/signup", async (req, res) => {
  const {
    firstName, lastName, email, dateOfBirth, phoneNumber,
    department, project, team, password, role
  } = req.body;

  if (!firstName || !lastName || !email || !dateOfBirth ||
      !phoneNumber || !department || !project || !team || !password || !role) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[689]\d{7}$/;
  const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
  const allowedDepartments = ["DTO", "P&A", "PPC", "Finance", "A&I", "Marketing"];
  const allowedRoles = ["admin", "member"];

  if (!emailRegex.test(email)) return res.status(400).json({ message: "Invalid email format" });
  if (!phoneRegex.test(phoneNumber)) return res.status(400).json({ message: "Invalid phone number" });
  if (!dobRegex.test(dateOfBirth)) return res.status(400).json({ message: "Invalid date format (YYYY-MM-DD)" });
  if (!allowedDepartments.includes(department)) return res.status(400).json({ message: "Invalid department" });
  if (!allowedRoles.includes(role)) return res.status(400).json({ message: "Invalid role" });

  try {
    await sql.connect(config);

    const checkRequest = new sql.Request();
    checkRequest.input("email", sql.NVarChar, email);
    const existingUser = await checkRequest.query(`SELECT Email FROM Users WHERE Email = @email`);

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const request = new sql.Request();
    const query = `
      INSERT INTO Users (
        FirstName, LastName, Email, DateOfBirth, PhoneNumber,
        Department, Project, Team, Password, Role
      )
      VALUES (
        @firstName, @lastName, @Email, @DateOfBirth, @PhoneNumber,
        @Department, @Project, @Team, @Password, @Role
      )
    `;

    request.input("firstName", sql.NVarChar, firstName);
    request.input("lastName", sql.NVarChar, lastName);
    request.input("Email", sql.NVarChar, email);
    request.input("DateOfBirth", sql.Date, dateOfBirth);
    request.input("PhoneNumber", sql.NVarChar, phoneNumber);
    request.input("Department", sql.NVarChar, department);
    request.input("Project", sql.NVarChar, project);
    request.input("Team", sql.NVarChar, team);
    request.input("Password", sql.NVarChar, hashedPassword);
    request.input("Role", sql.NVarChar, role);

    await request.query(query);
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ message: "Signup failed" });
  }
});

// === LOGIN Route ===
app.post("/login", async (req, res) => {
  const { type, email, password } = req.body;

  // ----------------------------------------
  // Microsoft Entra Login
  // ----------------------------------------
  if (type === "entra") {
    const authUrl = await msalClient.getAuthCodeUrl({
      scopes: ["openid", "profile", "email"],
      redirectUri: MS_REDIRECT_URI
    });
    return res.json({ redirect: authUrl });
  }

  // ----------------------------------------
  // Normal Email/Password Login
  // ----------------------------------------
  if (!email || !password)
    return res.status(400).send("Missing email or password");

  try {
    await sql.connect(config);

    const request = new sql.Request();
    request.input("email", sql.NVarChar, email);
    const result = await request.query(`SELECT * FROM Users WHERE Email = @email`);

    const user = result.recordset[0];
    if (!user) return res.status(401).send("Invalid email or password");

    const match = await bcrypt.compare(password, user.Password);
    if (!match) return res.status(401).send("Invalid email or password");

    const token = jwt.sign(
      {
        id: user.Id,
        email: user.Email,
        name: `${user.FirstName} ${user.LastName}`,
        department: user.Department,
        role: user.Role
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000
    });

    res.status(200).json({ message: "Login successful", role: user.Role });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).send("Login failed");
  }

});

// === MICROSOFT ENTRA CALLBACK ===
app.get("/auth/ms-callback", async (req, res) => {
  const code = req.query.code;

  try {
    const tokenResponse = await msalClient.acquireTokenByCode({
      code,
      scopes: ["openid", "profile", "email"],
      redirectUri: MS_REDIRECT_URI
    });

    const { idTokenClaims } = tokenResponse;

    const email = idTokenClaims.preferred_username;
    const firstName = idTokenClaims.given_name || "";
    const lastName = idTokenClaims.family_name || "";

    // === Check user in SQL ===
    await sql.connect(config);
    const findUser = new sql.Request();
    findUser.input("email", sql.NVarChar, email);

    const existing = await findUser.query(`
      SELECT * FROM Users WHERE Email = @email
    `);

    let user;

    if (existing.recordset.length === 0) {
      // === CREATE USER if first-time Entra login ===
      const insert = new sql.Request();
      insert.input("firstName", sql.NVarChar, firstName);
      insert.input("lastName", sql.NVarChar, lastName);
      insert.input("Email", sql.NVarChar, email);
      insert.input("DateOfBirth", sql.Date, null);
      insert.input("PhoneNumber", sql.NVarChar, null);
      insert.input("Department", sql.NVarChar, "DTO"); // default
      insert.input("Project", sql.NVarChar, null);
      insert.input("Team", sql.NVarChar, null);
      insert.input("Password", sql.NVarChar, null); // Microsoft login → no password
      insert.input("Role", sql.NVarChar, "member"); // default role

      await insert.query(`
        INSERT INTO Users (
          FirstName, LastName, Email, DateOfBirth, PhoneNumber,
          Department, Project, Team, Password, Role
        )
        VALUES (
          @firstName, @lastName, @Email, @DateOfBirth, @PhoneNumber,
          @Department, @Project, @Team, @Password, @Role
        )
      `);

      // Fetch the inserted user
      const getNew = await findUser.query(`
        SELECT * FROM Users WHERE Email = @email
      `);
      user = getNew.recordset[0];
    } else {
      user = existing.recordset[0];
    }

    // === Issue JWT to frontend ===
    const jwtToken = jwt.sign(
      {
        id: user.Id,
        email: user.Email,
        name: `${user.FirstName} ${user.LastName}`,
        department: user.Department,
        role: user.Role
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.cookie("token", jwtToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000
    });

    // === REDIRECT USER BACK TO FRONTEND ===
    return res.redirect("http://localhost:5173/admindashboard");

  } catch (err) {
    console.error("🛑 Microsoft Login Error:", err);
    res.status(500).send("Microsoft login failed");
  }
});


// === USERS CRUD Routes ===
app.get("/users", verifyToken(), async (req, res) => {
  try {
    await sql.connect(config);
    const result = await new sql.Request().query(`
      SELECT ID as id, FirstName as firstName, LastName as lastName,
      Email as email, DateOfBirth as dateOfBirth, PhoneNumber as phoneNumber,
      Department as department, Project as project, Team as team, Role as role
      FROM Users ORDER BY ID DESC
    `);

    const users = result.recordset.map(u => ({
      ...u,
      avatar: `${u.firstName[0]}${u.lastName[0]}`,
      dateJoined: null
    }));

    res.status(200).json(users);
  } catch (err) {
    console.error("Get Users Error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.get("/users/:id", verifyToken(), async (req, res) => {
  const { id } = req.params;
  try {
    await sql.connect(config);
    const request = new sql.Request();
    request.input("id", sql.Int, id);
    const result = await request.query(`
      SELECT ID as id, FirstName as firstName, LastName as lastName,
      Email as email, DateOfBirth as dateOfBirth, PhoneNumber as phoneNumber,
      Department as department, Project as project, Team as team, Role as role
      FROM Users WHERE ID = @id
    `);

    if (result.recordset.length === 0) return res.status(404).json({ message: "User not found" });
    const user = result.recordset[0];
    user.avatar = `${user.firstName[0]}${user.lastName[0]}`;
    res.status(200).json(user);
  } catch (err) {
    console.error("Get User Error:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

app.put("/users/:id", verifyToken(), async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, dateOfBirth, phoneNumber, department, project, team, role } = req.body;

  if (!firstName || !lastName || !email || !department || !role)
    return res.status(400).json({ message: "Missing required fields" });

  try {
    await sql.connect(config);

    const checkRequest = new sql.Request();
    checkRequest.input("id", sql.Int, id);
    const exists = await checkRequest.query(`SELECT ID FROM Users WHERE ID = @id`);
    if (exists.recordset.length === 0) return res.status(404).json({ message: "User not found" });

    const update = new sql.Request();
    update.input("id", sql.Int, id);
    update.input("firstName", sql.NVarChar, firstName);
    update.input("lastName", sql.NVarChar, lastName);
    update.input("email", sql.NVarChar, email);
    update.input("dateOfBirth", sql.Date, dateOfBirth || null);
    update.input("phoneNumber", sql.NVarChar, phoneNumber || null);
    update.input("department", sql.NVarChar, department);
    update.input("project", sql.NVarChar, project || null);
    update.input("team", sql.NVarChar, team || null);
    update.input("role", sql.NVarChar, role);

    await update.query(`
      UPDATE Users SET
      FirstName=@firstName, LastName=@lastName, Email=@email,
      DateOfBirth=@dateOfBirth, PhoneNumber=@phoneNumber,
      Department=@department, Project=@project, Team=@team, Role=@role
      WHERE ID=@id
    `);
    res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    console.error("Update User Error:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
});

app.delete("/users/:id", verifyToken(), async (req, res) => {
  const { id } = req.params;
  try {
    await sql.connect(config);
    const request = new sql.Request();
    request.input("id", sql.Int, id);
    const result = await request.query(`DELETE FROM Users WHERE ID = @id`);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete User Error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// === USER PROFILE ===
app.get("/user/profile", verifyToken(), async (req, res) => {
  try {
    const userData = {
      firstName: req.user.name.split(" ")[0],
      lastName: req.user.name.split(" ")[1] || "",
      role: req.user.role,
      email: req.user.email,
      department: req.user.department,
      id: req.user.id
    };
    res.status(200).json(userData);
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// === TEST ROUTES ===
app.get("/test", (req, res) => {
  res.status(200).json({
    message: "API is working perfectly!",
    timestamp: new Date(),
    server: "Running on port 3000"
  });
});

app.get("/test-auth", verifyToken(), (req, res) => {
  res.status(200).json({
    message: "Authentication is working!",
    user: req.user,
    timestamp: new Date()
  });
});

app.get("/test-db", verifyToken(), async (req, res) => {
  try {
    await sql.connect(config);
    const schema = await new sql.Request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Users' ORDER BY ORDINAL_POSITION
    `);
    res.status(200).json({ message: "Database OK", schema: schema.recordset });
  } catch (err) {
    console.error("Database test error:", err);
    res.status(500).json({ message: "Database test failed", error: err.message });
  }
});

// === LOGOUT Route ===
app.post("/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "lax" })
    .status(200)
    .json({ message: "Logout successful" });
});
const masterPlanAiRoutes = require("./routes/masterPlanAiRoutes");
app.use("/masterplan-ai", masterPlanAiRoutes);

app.use("/calendar", require("./routes/calendarRoutes"));

// === Mount Routes ===
app.use(require("./routes/dashboard"));
app.use(require("./routes/plan"));
app.use(require("./routes/individual"));
app.use(require("./routes/actuals"));
app.use("/api/ollama", require("./routes/ollama"));
const manicTimeRoutes = require("./routes/manictime");
app.use("/api", manicTimeRoutes);
const actualsAIRoutes = require("./routes/actualsAIRoutes");
app.use("/api", actualsAIRoutes);
// === Start Server ===
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
