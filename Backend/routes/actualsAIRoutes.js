const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const { matchProjectToManicTime } = require("../controllers/actualsAIController");

router.post('/actuals/match-project', verifyToken(), matchProjectToManicTime);

module.exports = router;
