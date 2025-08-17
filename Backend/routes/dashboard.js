// routes/dashboard.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");

// Admin-only dashboard
router.get("/dashboard/admin", verifyToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).send("Access denied. Admins only.");
  }
  res.send("👑 Welcome to the Admin Dashboard");
});

// Member-only dashboard
router.get("/dashboard/member", verifyToken, (req, res) => {
  if (req.user.role !== "member") {
    return res.status(403).send("Access denied. Members only.");
  }
  res.send("👤 Welcome to the Member Dashboard");
});

// General dashboard route (optional)
router.get("/dashboard", verifyToken, (req, res) => {
  res.send(`Welcome ${req.user.name}, your role is ${req.user.role}`);
});

module.exports = router;
