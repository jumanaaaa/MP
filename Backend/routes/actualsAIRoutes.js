const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const { getAIActualsRecommendation } = require("../controllers/actualsAIController");

router.post("/ai/actuals-recommend", verifyToken(), getAIActualsRecommendation);

module.exports = router;
