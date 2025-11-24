const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const { fetchSummaryData, fetchUserSummary } = require("../controllers/manictimeController");

router.get("/manictime/summary", fetchSummaryData);
router.get("/manictime/user-summary", verifyToken(), fetchUserSummary); 

module.exports = router;
