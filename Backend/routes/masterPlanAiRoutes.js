// routes/masterPlanAiRoutes.js

const express = require("express");
const router = express.Router();
const { generateAIMasterPlan } = require("../controllers/masterPlanAiController");
const verifyToken = require("../middleware/auth");

router.post("/generate", verifyToken(["admin", "member"]), generateAIMasterPlan);

module.exports = router;
