const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const { generateRecommendations } = require("../controllers/individualPlanAiController");

// POST - Generate AI recommendations for individual plan
// Available to both admin and members
router.post(
  "/individual-plan/ai-recommendations", 
  verifyToken(["admin", "member"]), 
  generateRecommendations
);

module.exports = router;