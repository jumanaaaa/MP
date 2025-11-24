// routes/masterPlanAiRoutes.js

const express = require("express");
const router = express.Router();
const { generateAIMasterPlan } = require("../controllers/masterPlanAIController");
const auth = require("../middleware/auth");

router.post("/generate", auth, generateAIMasterPlan);

module.exports = router;
