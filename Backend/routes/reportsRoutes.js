const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const reportsController = require("../controllers/reportsController");

/**
 * @route   GET /api/reports
 * @desc    Get user's actuals vs ManicTime comparison report
 * @query   fromDate - Start date (YYYY-MM-DD)
 * @query   toDate - End date (YYYY-MM-DD)
 * @access  Private (authenticated users)
 */
router.get(
  "/reports",
  verifyToken(),
  reportsController.getUserReports
);

module.exports = router;