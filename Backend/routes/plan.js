const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const checkPlanPermission = require("../middleware/checkPlanPermission"); // 🆕 NEW
const {
  createMasterPlan,
  getMasterPlans,
  getMasterPlanById,
  getUserPermission,
  getPlanTeam,
  updateMasterPlan,
  deleteMasterPlan,
  sendMilestoneDeadlineEmail,
} = require("../controllers/planController");

// CREATE — only Admin can create
router.post("/plan/master", verifyToken(["admin"]), createMasterPlan);

// READ ALL — Admin & Member can view their accessible plans
router.get("/plan/master", verifyToken(["admin", "member"]), getMasterPlans);

// 🆕 READ SINGLE — requires viewer permission
router.get(
  "/plan/master/:id", 
  verifyToken(["admin", "member"]),
  checkPlanPermission('viewer'),
  getMasterPlanById
);

// 🆕 GET USER PERMISSION
router.get(
  "/plan/master/:id/permission",
  verifyToken(["admin", "member"]),
  getUserPermission
);

// 🆕 GET PLAN TEAM
router.get(
  "/plan/master/:id/team",
  verifyToken(["admin", "member"]),
  checkPlanPermission('viewer'),
  getPlanTeam
);

// UPDATE — requires editor permission + auth
router.put(
  "/plan/master/:id", 
  verifyToken(["admin", "member"]),
  checkPlanPermission('editor'),
  updateMasterPlan
);

// DELETE — requires editor permission (allows editors & owners)
router.delete(
  "/plan/master/:id", 
  verifyToken(["admin", "member"]),
  checkPlanPermission('editor'),
  deleteMasterPlan
);

// EMAIL — both Admin & Member can trigger notifications
router.post(
  "/notifications/milestone-deadline", 
  verifyToken(["admin", "member"]), 
  sendMilestoneDeadlineEmail
);

module.exports = router;