const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const {
  getAllApprovals,
  approvePlan,
  rejectPlan,
  getApprovalStats,
  getApprovalDetails
} = require("../controllers/approvalsController");

// GET - List all approvals (both approvers and regular users can view)
router.get(
  "/approvals",
  verifyToken(["admin", "member"]),
  getAllApprovals
);

// GET - Get approval statistics
router.get(
  "/approvals/stats",
  verifyToken(["admin", "member"]),
  getApprovalStats
);

// GET - Get specific approval details
router.get(
  "/approvals/:planId",
  verifyToken(["admin", "member"]),
  getApprovalDetails
);

// POST - Approve a plan (only authorized approvers)
router.post(
  "/approvals/:planId/approve",
  verifyToken(["admin", "member"]),
  approvePlan
);

// POST - Reject a plan (only authorized approvers)
router.post(
  "/approvals/:planId/reject",
  verifyToken(["admin", "member"]),
  rejectPlan
);

module.exports = router;