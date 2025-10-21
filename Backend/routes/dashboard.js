// routes/dashboard.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");

// Admin-only dashboard
router.get("/dashboard/admin", verifyToken(["admin"]), (req, res) => {
  res.send("👑 Welcome to the Admin Dashboard");
});

// Member-only dashboard
router.get("/dashboard/member", verifyToken(["member"]), (req, res) => {
  res.send("👤 Welcome to the Member Dashboard");
});

// General dashboard (any authenticated user)
router.get("/dashboard", verifyToken(), (req, res) => {
  res.send(`Welcome ${req.user.name}, your role is ${req.user.role}`);
});

module.exports = router;
