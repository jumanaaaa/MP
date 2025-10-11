const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const actualsController = require("../controllers/actualsController");

// POST - create new actual
router.post("/actuals", verifyToken, actualsController.createActual);

// GET - list all actuals for logged-in user
router.get("/actuals", verifyToken, actualsController.getActuals);

// GET - capacity utilization
router.get("/actuals/capacity", verifyToken, actualsController.getCapacityUtilization);

// GET - user statistics for dashboard
router.get("/actuals/stats", verifyToken, actualsController.getUserStats);

module.exports = router;