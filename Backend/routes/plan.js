const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const {
  createMasterPlan,
  getMasterPlans,
  updateMasterPlan,
  deleteMasterPlan,
  sendMilestoneDeadlineEmail,
} = require("../controllers/planController");

// CREATE — only Admin can create
router.post("/plan/master", verifyToken(["admin"]), createMasterPlan);

// READ — Admin & Member can view
router.get("/plan/master", verifyToken(["admin", "member"]), getMasterPlans);

// UPDATE — only Admin can update
router.put("/plan/master/:id", verifyToken(["admin"]), updateMasterPlan);

// DELETE — only Admin can delete
router.delete("/plan/master/:id", verifyToken(["admin"]), deleteMasterPlan);

// EMAIL — both Admin & Member can trigger notifications
router.post("/notifications/milestone-deadline", verifyToken(["admin", "member"]), sendMilestoneDeadlineEmail);

module.exports = router;
