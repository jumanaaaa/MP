const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const weeklyController = require("../controllers/weeklyAllocationController");
const aiController = require("../controllers/weeklyPlanningAiController");

// ==================== WEEKLY ALLOCATIONS CRUD ====================

// GET allocations for a specific week
router.get("/weekly-allocations", verifyToken(), weeklyController.getWeeklyAllocations);

// GET all allocations (for timeline view)
router.get("/weekly-allocations/all", verifyToken(), weeklyController.getAllAllocations);

// CREATE or UPDATE weekly allocation
router.post("/weekly-allocations", verifyToken(), weeklyController.saveWeeklyAllocation);

router.put("/weekly-allocations/:id", verifyToken(), weeklyController.updateWeeklyAllocation);

// UPDATE allocation status
router.patch("/weekly-allocations/:id/status", verifyToken(), weeklyController.updateAllocationStatus);

// DELETE weekly allocation
router.delete("/weekly-allocations/:id", verifyToken(), weeklyController.deleteWeeklyAllocation);

// ==================== AI RECOMMENDATIONS ====================

// Generate AI recommendations for a week
router.post("/weekly-allocations/ai-recommendations", verifyToken(), aiController.generateWeeklyRecommendations);

module.exports = router;