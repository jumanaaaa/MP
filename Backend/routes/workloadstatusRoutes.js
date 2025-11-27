const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const workloadStatusController = require("../controllers/workloadStatusController");

/**
 * @route   GET /api/workload-status
 * @desc    Get workload status for all users (admin only - checked in controller)
 * @access  Private (authenticated users)
 */
router.get(
  "/workload-status",
  verifyToken(), // Call the factory function to get middleware
  workloadStatusController.getWorkloadStatus
);

/**
 * @route   GET /api/workload-status/me
 * @desc    Get workload status for current user
 * @access  Private (authenticated users)
 */
router.get(
  "/workload-status/me",
  verifyToken(), // Call the factory function to get middleware
  workloadStatusController.getMyWorkloadStatus
);

module.exports = router;