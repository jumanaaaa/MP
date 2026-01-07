require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { sql, config } = require("./db");
const msal = require("@azure/msal-node");
const { checkMilestoneReminders } = require('./controllers/individualController');

const cron = require("node-cron");
const { getValidManicTimeToken } = require("./middleware/manictimeauth");

cron.schedule("0 9 * * *", async () => {
  console.log("[CRON] Running milestone reminder check (9:00 AM)");
  try {
    await checkMilestoneReminders();
    console.log("[CRON] Milestone reminders sent successfully");
  } catch (err) {
    console.error("[CRON] Milestone reminder check failed:", err.message);
  }
});

const msalConfig = {
  auth: {
    clientId: process.env.MS_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}`,
    clientSecret: process.env.MS_CLIENT_SECRET
  }
};

const msalClient = new msal.ConfidentialClientApplication(msalConfig);

const { fetchSummaryData } = require("./controllers/manictimeController");

cron.schedule("0 * * * *", async () => {
  console.log("[CRON] Fetching ManicTime summary...");

  const ok = await fetchSummaryData(null, null);

  if (ok) {
    console.log("[CRON] Summary fetched successfully");
  } else {
    console.error("[CRON] Summary completed with errors");
  }
});

const app = express();

const { getPool } = require("./db/pool");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://maxcap.azurewebsites.net"
  ],
  credentials: true
}));

const verifyToken = require("./middleware/auth");

app.post("/api/signup", async (req, res) => {
  const {
    firstName, lastName, email, dateOfBirth, phoneNumber, department, team, password, role, isApprover, deviceName, timelineKey, subscriptionId, assignedUnder
  } = req.body;

  try {
    const pool = await getPool();

    if (assignedUnder && isNaN(Number(assignedUnder))) {
      return res.status(400).json({ message: "Invalid AssignedUnder value" });
    }

    const finalDeviceName =
      deviceName?.trim() !== ""
        ? deviceName.trim()
        : `dev_${email}_${Date.now()}`;

    const checkDevice = await pool.request()
      .input("deviceName", sql.NVarChar, finalDeviceName)
      .query(`SELECT Id FROM Users WHERE DeviceName = @deviceName`);

    if (checkDevice.recordset.length > 0) {
      return res.status(400).json({ message: "Device name already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const request = pool.request();
    request.input("firstName", sql.NVarChar, firstName);
    request.input("lastName", sql.NVarChar, lastName || "");
    request.input("Email", sql.NVarChar, email);
    request.input("DateOfBirth", sql.Date, dateOfBirth);
    request.input("PhoneNumber", sql.NVarChar, phoneNumber);
    request.input("Department", sql.NVarChar, department);
    request.input("Team", sql.NVarChar, team);
    request.input("Password", sql.NVarChar, hashedPassword);
    request.input("Role", sql.NVarChar, role);
    request.input("IsApprover", sql.Bit, isApprover ? 1 : 0);
    request.input("DeviceName", sql.NVarChar, finalDeviceName);
    request.input("TimelineKey", sql.NVarChar, timelineKey || null);
    request.input("SubscriptionId", sql.Int, subscriptionId || null);
    request.input("AssignedUnder", sql.Int, assignedUnder || null);

    const query = `
      INSERT INTO Users (
  FirstName, LastName, Email, DateOfBirth, PhoneNumber,
  Department, Team, Password, Role, DeviceName, TimelineKey, SubscriptionId, AssignedUnder, IsApprover
)
OUTPUT INSERTED.Id
VALUES (
  @firstName, @lastName, @Email, @DateOfBirth, @PhoneNumber,
  @Department, @Team, @Password, @Role, @DeviceName, @TimelineKey, @SubscriptionId, @AssignedUnder, @IsApprover
)
    `;

    const insertResult = await request.query(query);

    const newUserId = insertResult.recordset[0]?.Id;

    if (!newUserId) {
      throw new Error("Failed to retrieve new user ID");
    }

    res.status(201).json({
      message: "User registered successfully",
      deviceAssigned: finalDeviceName,
      user: { id: newUserId }
    });

  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ message: "Signup failed" });
  }
});

app.post("/api/login", async (req, res) => {
  const { type, email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Missing email or password" });

  try {
    const pool = await getPool();

    const request = pool.request();
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
        role: user.Role,
        isApprover: user.IsApprover
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000
    });

    res.status(200).json({ message: "Login successful", role: user.Role });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).send("Login failed");
  }
});

app.post("/api/login/microsoft", async (req, res) => {
  console.log("MICROSOFT LOGIN (SPA)");

  try {
    const authHeader = req.headers.authorization;
    console.log("Authorization header received:", authHeader ? "YES" : "NO");

    if (!authHeader) {
      console.error("Missing Authorization header");
      return res.status(400).json({ error: "Missing Authorization header" });
    }

    const accessToken = authHeader.split(" ")[1];
    console.log("Extracted access token:", accessToken ? "YES" : "NO");

    if (!accessToken) {
      console.error("Token missing after split");
      return res.status(400).json({ error: "Missing token" });
    }

    const decoded = jwt.decode(accessToken);
    console.log("Decoded Microsoft token:", JSON.stringify(decoded, null, 2));

    const email = decoded?.preferred_username
      || decoded?.email
      || decoded?.upn
      || decoded?.unique_name;

    const firstName = decoded?.given_name
      || decoded?.name?.split(' ')[0]
      || email?.split('@')[0]
      || "User";

    const lastName = decoded?.family_name
      || decoded?.name?.split(' ').slice(1).join(' ')
      || "";

    console.log(`Extracted Email: ${email}`);
    console.log(`Extracted Name: ${firstName} ${lastName}`);

    if (!email) {
      console.error("Could not extract email from token");
      console.error("Available fields in token:", Object.keys(decoded || {}));
      return res.status(400).json({
        error: "Could not extract email from token",
        availableFields: Object.keys(decoded || {})
      });
    }

    const pool = await getPool();
    console.log("Connected to SQL, checking user");

    const findUser = pool.request();
    findUser.input("email", sql.NVarChar, email);

    const existing = await findUser.query(`SELECT * FROM Users WHERE Email = @email`);
    console.log("SQL query result:", existing.recordset.length, "user(s) found");

    let user;

    if (existing.recordset.length === 0) {
      console.log("User not found, creating new user");

      const insert = pool.request();
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

      console.log("User created successfully");

      const getNew = await findUser.query(`SELECT * FROM Users WHERE Email = @email`);
      user = getNew.recordset[0];
    } else {
      console.log("Existing user found");
      user = existing.recordset[0];
    }

    console.log("Issuing internal JWT for:", user.Email);

    const internalJwt = jwt.sign(
      {
        id: user.Id,
        email: user.Email,
        name: `${user.FirstName} ${user.LastName}`,
        department: user.Department,
        role: user.Role,
        isApprover: user.IsApprover
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    console.log("Storing Microsoft access token...");
    const updateTokens = pool.request();
    updateTokens.input("userId", sql.Int, user.Id);
    updateTokens.input("accessToken", sql.NVarChar, accessToken);
    updateTokens.input("tokenExpiry", sql.DateTime, new Date(Date.now() + 3600000));

    await updateTokens.query(`
      UPDATE Users 
      SET MicrosoftAccessToken = @accessToken,
          MicrosoftTokenExpiry = @tokenExpiry
      WHERE Id = @userId
    `);

    console.log("Microsoft token stored for calendar access");

    res.cookie("token", internalJwt, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000,
      path: "/"
    });

    console.log("Cookie set successfully");

    return res.json({ message: "Microsoft login successful", role: user.Role });

  } catch (err) {
    console.error("Microsoft SPA login error:", err);
    return res.status(500).json({ error: "Microsoft login failed", details: err.message });
  }
});

app.get("/api/users", verifyToken(), async (req, res) => {
  try {
    const pool = await getPool();

    const [usersResult, projectsResult] = await Promise.all([
      pool.request().query(`
        SELECT 
          u.ID as id,
          u.FirstName as firstName,
          u.LastName as lastName,
          u.Email as email,
          u.DateOfBirth as dateOfBirth,
          u.PhoneNumber as phoneNumber,
          u.Department as department,
          u.Team as team,
          u.Role as role,
          u.IsApprover as isApprover,
          u.DeviceName as deviceName,
          u.TimelineKey as timelineKey,
          u.SubscriptionId as subscriptionId,
          u.AssignedUnder as assignedUnder,
          s.SubscriptionName as subscriptionName,
          s.WorkspaceId as workspaceId,
          s.ClientId as clientId
        FROM Users u
        LEFT JOIN ManicTimeSubscriptions s ON u.SubscriptionId = s.Id
        ORDER BY u.ID DESC
      `),
      pool.request().query(`
        SELECT 
          uc.UserId,
          c.Id as projectId,
          c.Name as projectName,
          c.ProjectType
        FROM UserContexts uc
        JOIN Contexts c ON uc.ContextId = c.Id
        ORDER BY uc.UserId, c.Name
      `)
    ]);

    const projectsByUser = {};
    projectsResult.recordset.forEach(p => {
      if (!projectsByUser[p.UserId]) {
        projectsByUser[p.UserId] = [];
      }
      projectsByUser[p.UserId].push({
        id: p.projectId,
        name: p.projectName,
        projectType: p.ProjectType
      });
    });

    const users = usersResult.recordset.map(u => ({
      ...u,
      projects: projectsByUser[u.id] || [],
      avatar: u.firstName && u.lastName
        ? `${u.firstName[0]}${u.lastName[0]}`
        : u.firstName
          ? u.firstName[0]
          : '?',  // ✅ SAFE: handles null/empty lastName
      dateJoined: null
    }));

    res.status(200).json(users);
  } catch (err) {
    console.error("Get Users Error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.get("/api/user/list", verifyToken(), async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        Id as id, 
        FirstName as firstName, 
        LastName as lastName,
        Email as email,
        Department as department,
        Role as role
      FROM Users 
      WHERE Role IN ('admin', 'member')
      ORDER BY FirstName, LastName
    `);

    res.status(200).json({ users: result.recordset });
  } catch (err) {
    console.error("Get user list error:", err);
    res.status(500).json({ message: "Failed to fetch user list" });
  }
});

app.get("/api/users/:id", verifyToken(), async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input("id", sql.Int, id);
    const result = await request.query(`
      SELECT 
        ID as id,
        FirstName as firstName,
        LastName as lastName,
        Email as email,
        DateOfBirth as dateOfBirth,
        PhoneNumber as phoneNumber,
        Department as department,
        Project as project,
        Team as team,
        Role as role,
        IsApprover as isApprover,
        DeviceName as deviceName,
        TimelineKey as timelineKey,
        SubscriptionId as subscriptionId,
        AssignedUnder as assignedUnder
      FROM Users
      WHERE ID = @id
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

app.put("/api/users/:id", verifyToken(), async (req, res) => {
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
    timelineKey,
    subscriptionId,
    assignedUnder,
    isApprover
  } = req.body;

  if (!firstName?.trim() || !email?.trim() || !department?.trim() || !role?.trim()) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (assignedUnder && Number(assignedUnder) === Number(id)) {
    return res.status(400).json({
      message: "User cannot be assigned under themselves"
    });
  }

  try {
    const pool = await getPool();

    const checkRequest = pool.request();
    checkRequest.input("id", sql.Int, id);
    const exists = await checkRequest.query(`SELECT ID, DeviceName FROM Users WHERE ID = @id`);
    if (exists.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldDevice = exists.recordset[0]?.DeviceName;
    const newDevice = deviceName?.trim() || null;

    if (oldDevice !== newDevice && newDevice) {
      const checkNewDevice = await pool.request()
        .input("deviceName", sql.NVarChar, newDevice)
        .input("userId", sql.Int, id)
        .query(`SELECT ID FROM Users WHERE DeviceName = @deviceName AND ID != @userId`);

      if (checkNewDevice.recordset.length > 0) {
        return res.status(400).json({
          message: `Device name "${newDevice}" is already assigned to another user`
        });
      }

      const tempDevice = `TEMP_${Date.now()}_${id}`;

      await pool.request()
        .input("id", sql.Int, id)
        .input("oldDevice", sql.NVarChar, oldDevice)
        .input("newDevice", sql.NVarChar, newDevice)
        .input("tempDevice", sql.NVarChar, tempDevice)
        .query(`
          BEGIN TRANSACTION;
          
          UPDATE Users SET DeviceName = @tempDevice WHERE ID = @id;
          UPDATE manicTime_summary SET deviceName = @tempDevice WHERE deviceName = @oldDevice;
          UPDATE Users SET DeviceName = @newDevice WHERE ID = @id;
          UPDATE manicTime_summary SET deviceName = @newDevice WHERE deviceName = @tempDevice;
          
          COMMIT TRANSACTION;
        `);
    }

    const update = pool.request();
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
    update.input("isApprover", sql.Bit, isApprover ? 1 : 0);
    update.input("deviceName", sql.NVarChar, newDevice);
    update.input("timelineKey", sql.NVarChar, timelineKey || null);
    update.input("subscriptionId", sql.Int, subscriptionId || null);
    update.input("assignedUnder", sql.Int, assignedUnder || null);

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
        IsApprover = @isApprover,
        DeviceName=@deviceName,
        TimelineKey=@timelineKey,
        SubscriptionId=@subscriptionId,
        AssignedUnder=@assignedUnder
      WHERE ID=@id
    `);

    const updatePlans = pool.request();
    updatePlans.input("userId", sql.Int, id);
    updatePlans.input("newSupervisorId", sql.Int, assignedUnder || null);

    await updatePlans.query(`
      UPDATE IndividualPlan
      SET SupervisorId = @newSupervisorId
      WHERE UserId = @userId
    `);

    console.log(`Updated supervisor for all plans of user ${id} to ${assignedUnder || 'NULL'}`);

    return res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    console.error("Update User Error:", err);
    return res.status(500).json({ message: "Failed to update user", error: err.message });
  }
});

app.delete("/api/users/:id", verifyToken(), async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();

    const getUserDevice = pool.request();
    getUserDevice.input("id", sql.Int, id);
    const userResult = await getUserDevice.query(`SELECT DeviceName FROM Users WHERE ID = @id`);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const deviceName = userResult.recordset[0]?.DeviceName;

    if (deviceName) {
      await pool.request()
        .input("deviceName", sql.NVarChar, deviceName)
        .query(`DELETE FROM manicTime_summary WHERE deviceName = @deviceName`);
    }

    await pool.request()
      .input("id", sql.Int, id)
      .query(`DELETE FROM Actuals WHERE UserId = @id`);

    await pool.request()
      .input("id", sql.Int, id)
      .query(`DELETE FROM IndividualPlan WHERE UserId = @id`);

    await pool.request()
      .input("id", sql.Int, id)
      .query(`DELETE FROM UserContexts WHERE UserId = @id`);

    await pool.request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE Users
        SET AssignedUnder = NULL
        WHERE AssignedUnder = @id
      `);

    await pool.request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE IndividualPlan
        SET SupervisorId = NULL
        WHERE SupervisorId = @id
      `);

    const request = pool.request();
    request.input("id", sql.Int, id);
    await request.query(`DELETE FROM Users WHERE ID = @id`);

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete User Error:", err);
    res.status(500).json({ message: "Failed to delete user", error: err.message });
  }
});

app.get("/api/user/profile", verifyToken(), async (req, res) => {
  try {
    const pool = await getPool();

    const userId = req.user.id;

    const projectsResult = await pool.request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT 
          c.Id as id,
          c.Name as name,
          c.ProjectType as projectType
        FROM UserContexts uc
        JOIN Contexts c ON uc.ContextId = c.Id
        WHERE uc.UserId = @userId
        ORDER BY c.ProjectType, c.Name
      `);

    const userData = {
      firstName: req.user.name.split(" ")[0],
      lastName: req.user.name.split(" ")[1] || "",
      role: req.user.role,
      email: req.user.email,
      department: req.user.department,
      id: req.user.id,
      assignedProjects: projectsResult.recordset
    };

    res.status(200).json(userData);
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

app.get("/api/test", (req, res) => {
  res.status(200).json({
    message: "API is working perfectly!",
    timestamp: new Date(),
    server: "Running on port 3000"
  });
});

app.get("/api/test-auth", verifyToken(), (req, res) => {
  res.status(200).json({
    message: "Authentication is working!",
    user: req.user,
    timestamp: new Date()
  });
});

app.get("/api/test-db", verifyToken(), async (req, res) => {
  try {
    const pool = await getPool();
    const schema = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Users' ORDER BY ORDINAL_POSITION
    `);
    res.status(200).json({ message: "Database OK", schema: schema.recordset });
  } catch (err) {
    console.error("Database test error:", err);
    res.status(500).json({ message: "Database test failed", error: err.message });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "lax" })
    .status(200)
    .json({ message: "Logout successful" });
});

const masterPlanAiRoutes = require("./routes/masterPlanAiRoutes");
app.use("/api/masterplan-ai", masterPlanAiRoutes);

app.use("/api/calendar", require("./routes/calendarRoutes"));

app.use("/api", require("./routes/dashboard"));
app.use("/api", require("./routes/plan"));
app.use("/api", require("./routes/individual"));
app.use("/api", require("./routes/actuals"));
app.use("/api/ollama", require("./routes/ollama"));

const manicTimeRoutes = require("./routes/manictime");
app.use("/api", manicTimeRoutes);

const actualsAIRoutes = require("./routes/actualsAIRoutes");
app.use("/api", actualsAIRoutes);

const individualPlanAIRoutes = require("./routes/individualPlanAiRoutes");
app.use("/api", individualPlanAIRoutes);

const approvalsRoutes = require("./routes/approvalsRoutes");
app.use("/api", approvalsRoutes);

const workloadStatusRoutes = require("./routes/workloadstatusRoutes");
app.use("/api", workloadStatusRoutes);

const reportsRoutes = require("./routes/reportsRoutes");
app.use("/api", reportsRoutes);

const masterPlanLocksRoutes = require("./routes/masterPlanLocksRoutes");
app.use("/api/plan", masterPlanLocksRoutes);

app.use("/api", require("./routes/aiContextRoutes"));

const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await getPool();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Database connection ready`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();