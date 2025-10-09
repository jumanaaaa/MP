const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const actualsController = require("../controllers/actualsController");

// POST - create new actual
router.post("/actuals", verifyToken, actualsController.createActual);

// GET - list all actuals
router.get("/actuals", verifyToken, actualsController.getActuals);

module.exports = router; // ✅ This line is CRITICAL
