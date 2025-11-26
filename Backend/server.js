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
        Department, Project, Team, Password, Role, DeviceName
      )
      VALUES (
        @firstName, @lastName, @Email, @DateOfBirth, @PhoneNumber,
        @Department, @Project, @Team, @Password, @Role, NULL
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
  // Normal Email/Password Login
  // ----------------------------------------
  if (!email || !password)
    return res.status(400).json({ error: "Missing email or password" });

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

// === MICROSOFT DIRECT TOKEN LOGIN FROM SPA ===
app.post("/login/microsoft", async (req, res) => {
  console.log("\n================ MICROSOFT LOGIN (SPA) ================");

  try {
    const authHeader = req.headers.authorization;
    console.log("🔵 Authorization header received:", authHeader ? "YES" : "NO");

    if (!authHeader) {
      console.error("❌ Missing Authorization header!");
      return res.status(400).json({ error: "Missing Authorization header" });
    }

    const accessToken = authHeader.split(" ")[1];
    console.log("🟣 Extracted access token:", accessToken ? "YES" : "NO");

    if (!accessToken) {
      console.error("❌ Token missing after split!");
      return res.status(400).json({ error: "Missing token" });
    }

    // DEBUG-DECODE
    const decoded = jwt.decode(accessToken);
    console.log("🟡 Decoded Microsoft token:", JSON.stringify(decoded, null, 2));

    // TRY MULTIPLE FIELD NAMES FOR EMAIL (different token types use different fields)
    const email = decoded?.preferred_username
      || decoded?.email
      || decoded?.upn
      || decoded?.unique_name;

    // TRY MULTIPLE FIELD NAMES FOR FIRST NAME
    const firstName = decoded?.given_name
      || decoded?.name?.split(' ')[0]
      || email?.split('@')[0]
      || "User";

    // TRY MULTIPLE FIELD NAMES FOR LAST NAME
    const lastName = decoded?.family_name
      || decoded?.name?.split(' ').slice(1).join(' ')
      || "";

    console.log(`📧 Extracted Email: ${email}`);
    console.log(`👤 Extracted Name: ${firstName} ${lastName}`);

    if (!email) {
      console.error("❌ Could not extract email from token!");
      console.error("Available fields in token:", Object.keys(decoded || {}));
      return res.status(400).json({
        error: "Could not extract email from token",
        availableFields: Object.keys(decoded || {})
      });
    }

    await sql.connect(config);
    console.log("🟢 Connected to SQL, checking user…");

    const findUser = new sql.Request();
    findUser.input("email", sql.NVarChar, email);

    const existing = await findUser.query(`SELECT * FROM Users WHERE Email = @email`);
    console.log("📀 SQL query result:", existing.recordset.length, "user(s) found");

    let user;

    if (existing.recordset.length === 0) {
      console.log("🆕 User not found — creating new user…");

      const insert = new sql.Request();
      insert.input("firstName", sql.NVarChar, firstName || "User");
      insert.input("lastName", sql.NVarChar, lastName || "");
      insert.input("Email", sql.NVarChar, email);
      insert.input("DateOfBirth", sql.Date, "2000-01-01");
      insert.input("PhoneNumber", sql.NVarChar, "00000000");
      insert.input("Department", sql.NVarChar, "DTO");
      insert.input("Project", sql.NVarChar, "N/A");
      insert.input("Team", sql.NVarChar, "N/A");
      insert.input("Password", sql.NVarChar, "microsoft-login");
      insert.input("Role", sql.NVarChar, "member");

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

      console.log("🆕 User created successfully!");

      const getNew = await findUser.query(`SELECT * FROM Users WHERE Email = @email`);
      user = getNew.recordset[0];
    } else {
      console.log("🔁 Existing user found!");
      user = existing.recordset[0];
    }

    console.log("🎫 Issuing internal JWT for:", user.Email);

    const internalJwt = jwt.sign(
      {
        id: user.Id,
        email: user.Email,
        name: `${user.FirstName} ${user.LastName}`,
        department: user.Department,
        role: user.Role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    console.log("💾 Storing Microsoft access token...");
    const updateTokens = new sql.Request();
    updateTokens.input("userId", sql.Int, user.Id);
    updateTokens.input("accessToken", sql.NVarChar, accessToken); // This is the Microsoft token
    updateTokens.input("tokenExpiry", sql.DateTime, new Date(Date.now() + 3600000)); // 1 hour

    await updateTokens.query(`
  UPDATE Users 
  SET MicrosoftAccessToken = @accessToken,
      MicrosoftTokenExpiry = @tokenExpiry
  WHERE Id = @userId
`);

    console.log("✅ Microsoft token stored for calendar access");


    res.cookie("token", internalJwt, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000,
      path: "/"
    });

    console.log("🍪 Cookie set successfully!");
    console.log("========================================================\n");

    return res.json({ message: "Microsoft login successful", role: user.Role });

  } catch (err) {
    console.error("❌ Microsoft SPA login error:", err);
    return res.status(500).json({ error: "Microsoft login failed", details: err.message });
  }
});


// === USERS CRUD Routes ===
app.get("/users", verifyToken(), async (req, res) => {
  try {
    await sql.connect(config);
    const result = await new sql.Request().query(`
      SELECT ID as id, FirstName as firstName, LastName as lastName,
Email as email, DateOfBirth as dateOfBirth, PhoneNumber as phoneNumber,
Department as department, Project as project, Team as team, Role as role,
DeviceName as deviceName
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
Department as department, Project as project, Team as team, Role as role,
DeviceName as deviceName
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
  const {
    firstName,
    lastName,
    email,
    dateOfBirth,
    phoneNumber,
    department,
    project,
    team,
    role,
    deviceName,
  } = req.body;

  if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !department?.trim() || !role?.trim()) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    await sql.connect(config);

    // 1️⃣ Check user exists and get old device name
    const checkRequest = new sql.Request();
    checkRequest.input("id", sql.Int, id);
    const exists = await checkRequest.query(`SELECT ID, DeviceName FROM Users WHERE ID = @id`);
    if (exists.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldDevice = exists.recordset[0]?.DeviceName;
    const newDevice = deviceName?.trim() || null;

    // 2️⃣ Handle DeviceName change ONLY if it's actually different
    if (oldDevice !== newDevice && newDevice) {
      // Check if new deviceName is already taken by another user
      const checkNewDevice = await new sql.Request()
        .input("deviceName", sql.NVarChar, newDevice)
        .input("userId", sql.Int, id)
        .query(`SELECT ID FROM Users WHERE DeviceName = @deviceName AND ID != @userId`);

      if (checkNewDevice.recordset.length > 0) {
        return res.status(400).json({ 
          message: `Device name "${newDevice}" is already assigned to another user` 
        });
      }

      // OPTIMIZED: Use a transaction and temp device in one go
      const tempDevice = `TEMP_${Date.now()}_${id}`;

      // Single batch update
      await new sql.Request()
        .input("id", sql.Int, id)
        .input("oldDevice", sql.NVarChar, oldDevice)
        .input("newDevice", sql.NVarChar, newDevice)
        .input("tempDevice", sql.NVarChar, tempDevice)
        .query(`
          BEGIN TRANSACTION;
          
          -- Step 1: Move user to temp
          UPDATE Users SET DeviceName = @tempDevice WHERE ID = @id;
          
          -- Step 2: Move manicTime_summary to temp
          UPDATE manicTime_summary SET deviceName = @tempDevice WHERE deviceName = @oldDevice;
          
          -- Step 3: Move user to new device
          UPDATE Users SET DeviceName = @newDevice WHERE ID = @id;
          
          -- Step 4: Move manicTime_summary to new device
          UPDATE manicTime_summary SET deviceName = @newDevice WHERE deviceName = @tempDevice;
          
          COMMIT TRANSACTION;
        `);
    }

    // 3️⃣ Update all other user fields (only if device didn't change, or after device change is complete)
    const update = new sql.Request();
    update.input("id", sql.Int, id);
    update.input("firstName", sql.NVarChar, firstName.trim());
    update.input("lastName", sql.NVarChar, lastName.trim());
    update.input("email", sql.NVarChar, email.trim());
    update.input("dateOfBirth", sql.Date, dateOfBirth || null);
    update.input("phoneNumber", sql.NVarChar, phoneNumber || null);
    update.input("department", sql.NVarChar, department.trim());
    update.input("project", sql.NVarChar, project || null);
    update.input("team", sql.NVarChar, team || null);
    update.input("role", sql.NVarChar, role.trim());
    update.input("deviceName", sql.NVarChar, newDevice);

    await update.query(`
      UPDATE Users SET
        FirstName=@firstName,
        LastName=@lastName,
        Email=@email,
        DateOfBirth=@dateOfBirth,
        PhoneNumber=@phoneNumber,
        Department=@department,
        Project=@project,
        Team=@team,
        Role=@role,
        DeviceName=@deviceName
      WHERE ID=@id
    `);

    return res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    console.error("Update User Error:", err);
    return res.status(500).json({ message: "Failed to update user", error: err.message });
  }
});

app.delete("/users/:id", verifyToken(), async (req, res) => {
  const { id } = req.params;
  try {
    await sql.connect(config);
    
    // Get user's device name first
    const getUserDevice = new sql.Request();
    getUserDevice.input("id", sql.Int, id);
    const userResult = await getUserDevice.query(`SELECT DeviceName FROM Users WHERE ID = @id`);
    
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const deviceName = userResult.recordset[0]?.DeviceName;
    
    // If user has a device name, handle manicTime_summary records
    if (deviceName) {
      // Option 1: Delete all manicTime_summary records for this device
      await new sql.Request()
        .input("deviceName", sql.NVarChar, deviceName)
        .query(`DELETE FROM manicTime_summary WHERE deviceName = @deviceName`);
      
      // OR Option 2: Set deviceName to NULL (orphan the records)
      // await new sql.Request()
      //   .input("deviceName", sql.NVarChar, deviceName)
      //   .query(`UPDATE manicTime_summary SET deviceName = NULL WHERE deviceName = @deviceName`);
    }
    
    // Now delete the user
    const request = new sql.Request();
    request.input("id", sql.Int, id);
    await request.query(`DELETE FROM Users WHERE ID = @id`);
    
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete User Error:", err);
    res.status(500).json({ message: "Failed to delete user", error: err.message });
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
