const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const {
  createMasterPlan,
  getMasterPlans,
  getMasterPlanById,
  getUserPermission,
  getPlanTeam,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  updateMasterPlan,
  updateMilestoneStatus, // 🔥   to destructuring
  deleteMasterPlan,
  sendMilestoneDeadlineEmail,
  getPlanHistory,
  sendApprovalRequest,
  sendPlanApproved,
  sendMilestoneWeekWarning
} = require("../controllers/planController");

// ==================== MASTER PLAN CRUD ====================

// CREATE
router.post("/plan/master", verifyToken(["admin"]), createMasterPlan);

// READ ALL
router.get("/plan/master", verifyToken(["admin", "member"]), getMasterPlans);

// READ SINGLE
router.get("/plan/master/:id", verifyToken(["admin", "member"]), getMasterPlanById);

// 🔥 UPDATE MILESTONE STATUS ONLY (no approval) - MUST BE BEFORE GENERAL UPDATE
router.put("/plan/master/:id/status", verifyToken(["admin", "member"]), updateMilestoneStatus);

// UPDATE (everything else - requires approval)
router.put("/plan/master/:id", verifyToken(["admin", "member"]), updateMasterPlan);

// DELETE
router.delete("/plan/master/:id", verifyToken(["admin", "member"]), deleteMasterPlan);

// ==================== PERMISSIONS & TEAM ====================

// GET USER PERMISSION
router.get("/plan/master/:id/permission", verifyToken(["admin", "member"]), getUserPermission);

// GET PLAN TEAM
router.get("/plan/master/:id/team", verifyToken(["admin", "member"]), getPlanTeam);

// 🆕 ADD TEAM MEMBER (Owner only)
router.post("/plan/master/:id/permissions", verifyToken(["admin", "member"]), addTeamMember);

// 🆕 UPDATE TEAM MEMBER PERMISSION (Owner only)
router.put("/plan/master/:id/permissions", verifyToken(["admin", "member"]), updateTeamMember);

// 🆕 REMOVE TEAM MEMBER (Owner only)
router.delete("/plan/master/:id/permissions/:userId", verifyToken(["admin", "member"]), removeTeamMember);

router.get("/plan/master/:id/history", verifyToken(), getPlanHistory);

// Milestone user assignment routes
router.post('/:id/milestone/:milestoneId/users', authMiddleware, masterPlanController.assignMilestoneUsers);
router.get('/:id/milestone/:milestoneId/users', authMiddleware, masterPlanController.getMilestoneUsers);
router.delete('/:id/milestone/:milestoneId/users/:userId', authMiddleware, masterPlanController.removeMilestoneUser);
router.get('/:id/milestone-assignments', authMiddleware, masterPlanController.getPlanMilestoneAssignments);

// ==================== EMAIL NOTIFICATIONS ====================

// MILESTONE DEADLINE EMAIL (day-of)
router.post("/notifications/milestone-deadline", verifyToken(["admin", "member"]), sendMilestoneDeadlineEmail);

// 🆕 APPROVAL REQUEST EMAIL (new plan or edits)
router.post("/plan/master/approval-request", verifyToken(["admin", "member"]), sendApprovalRequest);

// 🆕 PLAN APPROVED EMAIL (confirmation to creator)
router.post("/plan/master/plan-approved", verifyToken(["admin", "member"]), sendPlanApproved);

// 🆕 ONE WEEK WARNING EMAIL
router.post("/plan/master/milestone-week-warning", verifyToken(["admin", "member"]), sendMilestoneWeekWarning);

module.exports = router;