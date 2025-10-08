const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const individualController = require("../controllers/individualController");

// Create Individual Plan
router.post("/plan/individual", verifyToken, individualController.createIndividualPlan);

// Get all Individual Plans
router.get("/plan/individual", verifyToken, individualController.getIndividualPlans);

module.exports = router;
