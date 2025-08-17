require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sql, config } = require("./db");

const app = express();

const cookieParser = require("cookie-parser");
app.use(express.json());
app.use(cookieParser());

// === Import Auth Middleware ===
const verifyToken = require("./middleware/auth");

// === Middleware ===
app.use(cors({
    origin: "http://localhost:5173", // Your frontend dev server
    credentials: true // Allow cookies to be sent
}));

app.use(express.json());

// === SIGNUP Route ===
app.post("/signup", async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        dateOfBirth,
        phoneNumber,
        department,
        project,
        team,
        password,
        role
    } = req.body;

    if (!firstName || !lastName || !email || !dateOfBirth || !phoneNumber || !department || !project || !team || !password || !role) {
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
        
        // Check if email already exists
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

// === GET ALL USERS Route ===
app.get("/users", verifyToken, async (req, res) => {
    try {
        await sql.connect(config);
        const request = new sql.Request();
        
        const query = `
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
                Role as role
            FROM Users
            ORDER BY ID DESC
        `;
        
        const result = await request.query(query);
        
        // Format the data for frontend
        const users = result.recordset.map(user => ({
            ...user,
            avatar: `${user.firstName[0]}${user.lastName[0]}`,
            dateJoined: null // Set to null since CreatedAt column doesn't exist
        }));
        
        res.status(200).json(users);
    } catch (err) {
        console.error("Get Users Error:", err);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

// === GET SINGLE USER Route ===
app.get("/users/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    
    try {
        await sql.connect(config);
        const request = new sql.Request();
        request.input("id", sql.Int, id);
        
        const query = `
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
                Role as role
            FROM Users 
            WHERE ID = @id
        `;
        
        const result = await request.query(query);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        
        const user = result.recordset[0];
        user.avatar = `${user.firstName[0]}${user.lastName[0]}`;
        user.dateJoined = null; // Set to null since CreatedAt column doesn't exist
        
        res.status(200).json(user);
    } catch (err) {
        console.error("Get User Error:", err);
        res.status(500).json({ message: "Failed to fetch user" });
    }
});

// === UPDATE USER Route ===
app.put("/users/:id", verifyToken, async (req, res) => {
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
        role
    } = req.body;

    if (!firstName || !lastName || !email || !department || !role) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[689]\d{7}$/;
    const allowedDepartments = ["DTO", "P&A", "PPC", "Finance", "A&I", "Marketing"];
    const allowedRoles = ["admin", "member"];

    if (!emailRegex.test(email)) return res.status(400).json({ message: "Invalid email format" });
    if (phoneNumber && !phoneRegex.test(phoneNumber)) return res.status(400).json({ message: "Invalid phone number" });
    if (!allowedDepartments.includes(department)) return res.status(400).json({ message: "Invalid department" });
    if (!allowedRoles.includes(role)) return res.status(400).json({ message: "Invalid role" });

    try {
        await sql.connect(config);
        
        // Check if user exists
        const checkRequest = new sql.Request();
        checkRequest.input("id", sql.Int, id);
        const userExists = await checkRequest.query(`SELECT ID FROM Users WHERE ID = @id`);
        
        if (userExists.recordset.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        
        // Check if email is taken by another user
        const emailCheckRequest = new sql.Request();
        emailCheckRequest.input("email", sql.NVarChar, email);
        emailCheckRequest.input("id", sql.Int, id);
        const emailExists = await emailCheckRequest.query(`SELECT Email FROM Users WHERE Email = @email AND ID != @id`);
        
        if (emailExists.recordset.length > 0) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const request = new sql.Request();
        const query = `
            UPDATE Users SET
                FirstName = @firstName,
                LastName = @lastName,
                Email = @email,
                DateOfBirth = @dateOfBirth,
                PhoneNumber = @phoneNumber,
                Department = @department,
                Project = @project,
                Team = @team,
                Role = @role
            WHERE ID = @id
        `;

        request.input("id", sql.Int, id);
        request.input("firstName", sql.NVarChar, firstName);
        request.input("lastName", sql.NVarChar, lastName);
        request.input("email", sql.NVarChar, email);
        request.input("dateOfBirth", sql.Date, dateOfBirth || null);
        request.input("phoneNumber", sql.NVarChar, phoneNumber || null);
        request.input("department", sql.NVarChar, department);
        request.input("project", sql.NVarChar, project || null);
        request.input("team", sql.NVarChar, team || null);
        request.input("role", sql.NVarChar, role);

        await request.query(query);
        res.status(200).json({ message: "User updated successfully" });
    } catch (err) {
        console.error("Update User Error:", err);
        res.status(500).json({ message: "Failed to update user" });
    }
});

// === DELETE USER Route ===
app.delete("/users/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    
    try {
        await sql.connect(config);
        
        // Check if user exists
        const checkRequest = new sql.Request();
        checkRequest.input("id", sql.Int, id);
        const userExists = await checkRequest.query(`SELECT ID FROM Users WHERE ID = @id`);
        
        if (userExists.recordset.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        
        const request = new sql.Request();
        request.input("id", sql.Int, id);
        
        const query = `DELETE FROM Users WHERE ID = @id`;
        await request.query(query);
        
        res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
        console.error("Delete User Error:", err);
        res.status(500).json({ message: "Failed to delete user" });
    }
});

// === LOGIN Route ===
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send("Missing email or password");
    }

    try {
        await sql.connect(config);
        const request = new sql.Request();

        request.input("email", sql.NVarChar, email);
        const result = await request.query(`
            SELECT * FROM Users WHERE Email = @email
        `);

        const user = result.recordset[0];
        if (!user) {
            return res.status(401).send("Invalid email or password");
        }

        const match = await bcrypt.compare(password, user.Password);
        if (!match) {
            return res.status(401).send("Invalid email or password");
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user.ID,
                email: user.Email,
                name: `${user.FirstName} ${user.LastName}`,
                department: user.Department,
                role: user.Role
            },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        res
            .cookie("token", token, {
                httpOnly: true,
                secure: false,        // Set to true in production (HTTPS)
                sameSite: "lax",      // "strict" or "none" if cross-site
                maxAge: 2 * 60 * 60 * 1000 // 2 hours
            })
            .status(200)
            .json({
                message: "Login successful",
                role: user.Role
            });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).send("Login failed");
    }
});

// === USER PROFILE Route ===
app.get("/user/profile", verifyToken, async (req, res) => {
    try {
        // User data is available from JWT token via verifyToken middleware
        const userData = {
            firstName: req.user.name.split(' ')[0], // Extract first name from JWT
            lastName: req.user.name.split(' ')[1] || '',
            role: req.user.role,
            email: req.user.email,
            department: req.user.department,
            id: req.user.id
        };

        res.status(200).json(userData);
    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).json({ error: "Failed to fetch user profile" });
    }
});

// === LOGOUT Route (Optional - for future use) ===
app.post("/logout", (req, res) => {
    res
        .clearCookie("token", {
            httpOnly: true,
            secure: false,
            sameSite: "lax"
        })
        .status(200)
        .json({ message: "Logout successful" });
});

// === TEST Route (for debugging API connection) ===
app.get("/test", (req, res) => {
    res.status(200).json({ 
        message: "API is working perfectly!", 
        timestamp: new Date(),
        server: "Running on port 3000"
    });
});

// === TEST Route with Auth (for debugging authentication) ===
app.get("/test-auth", verifyToken, (req, res) => {
    res.status(200).json({ 
        message: "Authentication is working!", 
        user: req.user,
        timestamp: new Date()
    });
});

// === DATABASE SCHEMA TEST Route (for debugging database structure) ===
app.get("/test-db", verifyToken, async (req, res) => {
    try {
        await sql.connect(config);
        const request = new sql.Request();
        
        // Get table schema information
        const schemaQuery = `
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Users'
            ORDER BY ORDINAL_POSITION
        `;
        
        const schemaResult = await request.query(schemaQuery);
        
        // Get a sample user record
        const sampleQuery = `SELECT TOP 1 * FROM Users`;
        const sampleResult = await request.query(sampleQuery);
        
        res.status(200).json({ 
            message: "Database connection working!", 
            schema: schemaResult.recordset,
            sampleRecord: sampleResult.recordset[0] || null,
            timestamp: new Date()
        });
    } catch (err) {
        console.error("Database test error:", err);
        res.status(500).json({ 
            message: "Database test failed", 
            error: err.message 
        });
    }
});

// === Start Server ===
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// === Mount additional routes ===
const dashboardRoutes = require("./routes/dashboard");
app.use(dashboardRoutes);
// const authRoutes = require("./routes/auth");
// app.use(authRoutes);