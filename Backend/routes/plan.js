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
  deleteMasterPlan,
  sendMilestoneDeadlineEmail,
  getPlanHistory
} = require("../controllers/planController");

// ==================== MASTER PLAN CRUD ====================

// CREATE
router.post("/plan/master", verifyToken(["admin"]), createMasterPlan);

// READ ALL
router.get("/plan/master", verifyToken(["admin", "member"]), getMasterPlans);

// READ SINGLE
router.get("/plan/master/:id", verifyToken(["admin", "member"]), getMasterPlanById);

// UPDATE
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


// ==================== NOTIFICATIONS ====================

// SEND MILESTONE DEADLINE EMAIL
router.post("/notifications/milestone-deadline", verifyToken(["admin", "member"]), sendMilestoneDeadlineEmail);

module.exports = router;