// routes/actuals.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const actualsController = require("../controllers/actualsController");

// POST - create new actual (Admin + Member)
router.post("/actuals", verifyToken(["admin", "member"]), actualsController.createActual);

// GET - list all actuals for logged-in user (Admin + Member)
router.get("/actuals", verifyToken(["admin", "member"]), actualsController.getActuals);

// GET - list all actuals for logged-in user (Admin + Member)
router.get("/actuals/system", verifyToken(["admin", "member"]), actualsController.getSystemActuals);

// GET - capacity utilization (Admin only)
router.get("/actuals/capacity", verifyToken(["admin"]), actualsController.getCapacityUtilization);

// GET - Singapore public holidays
router.get("/actuals/holidays", verifyToken(["admin", "member"]), actualsController.getSingaporeHolidays);

// Update the stats route to accept query params
router.get("/actuals/stats", verifyToken(["admin", "member"]), actualsController.getUserStats);

module.exports = router;
