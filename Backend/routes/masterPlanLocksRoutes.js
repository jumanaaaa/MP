// routes/masterPlanLocksRoutes.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const lockController = require("../controllers/masterPlanLocksController");

// All routes require authentication
router.use(verifyToken());

// Lock management - 🆕 REMOVE /plan PREFIX (already in mount point)
router.post("/lock/:planId", lockController.acquireLock);
router.delete("/lock/:planId", lockController.releaseLock);
router.put("/lock/:planId/heartbeat", lockController.heartbeat);
router.get("/lock/:planId/status", lockController.getLockStatus);
router.post("/lock/:planId/takeover", lockController.takeoverLock);

// Admin/monitoring routes - 🆕 REMOVE /plan PREFIX
router.get("/locks/active", lockController.getActiveLocks);
router.delete("/locks/cleanup", lockController.cleanupExpiredLocks);

module.exports = router;