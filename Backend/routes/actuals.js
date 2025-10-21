// routes/actuals.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const actualsController = require("../controllers/actualsController");

// POST - create new actual (Admin + Member)
router.post("/actuals", verifyToken(["admin", "member"]), actualsController.createActual);

// GET - list all actuals for logged-in user (Admin + Member)
router.get("/actuals", verifyToken(["admin", "member"]), actualsController.getActuals);

// GET - capacity utilization (Admin only)
router.get("/actuals/capacity", verifyToken(["admin"]), actualsController.getCapacityUtilization);

// GET - user statistics for dashboard (Admin + Member)
router.get("/actuals/stats", verifyToken(["admin", "member"]), actualsController.getUserStats);

module.exports = router;
