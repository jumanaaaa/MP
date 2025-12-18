const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const individualController = require("../controllers/individualController");

// ==================== CRUD OPERATIONS ====================

// CREATE
router.post("/plan/individual", verifyToken(), individualController.createIndividualPlan);

// READ
router.get("/plan/individual", verifyToken(), individualController.getIndividualPlans);

// UPDATE
router.put("/plan/individual/:id", verifyToken(), individualController.updateIndividualPlan);

// UPDATE MILESTONE STATUS
router.patch("/plan/individual/:id/milestone", verifyToken(), individualController.updateMilestoneStatus);

// DELETE
router.delete("/plan/individual/:id", verifyToken(), individualController.deleteIndividualPlan);

// Supervisor read-only view
router.get(
    "/plan/individual/supervised",
    verifyToken(),
    individualController.getSupervisedIndividualPlans
);

// ==================== EMAIL NOTIFICATIONS ====================

// Manual trigger for milestone reminder check (for testing)
router.post(
  "/plan/individual/milestone-reminders/trigger",
  verifyToken(["admin"]),
  individualController.triggerMilestoneReminders
);

// Send individual milestone reminder (manual send)
router.post(
  "/plan/individual/milestone-reminder",
  verifyToken(["admin", "member"]),
  individualController.sendMilestoneReminder
);

module.exports = router;