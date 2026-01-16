const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const individualController = require("../controllers/individualController");

// ==================== EMAIL NOTIFICATIONS (SPECIFIC ROUTES) ====================
router.post(
  "/plan/individual/milestone-reminders/trigger",
  verifyToken(["admin"]),
  individualController.triggerMilestoneReminders
);

router.post(
  "/plan/individual/milestone-reminder",
  verifyToken(["admin", "member"]),
  individualController.sendMilestoneReminder
);

// ==================== SUPERVISED VIEW (SPECIFIC ROUTE) ====================
router.get(
  "/plan/individual/supervised",
  verifyToken(),
  individualController.getSupervisedIndividualPlans
);

// ==================== CRUD OPERATIONS (PARAMETERIZED ROUTES LAST) ====================

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

module.exports = router;