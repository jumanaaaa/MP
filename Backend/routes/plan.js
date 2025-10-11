// const express = require("express");
// const router = express.Router();
// const { createMasterPlan, getMasterPlans } = require("../controllers/planController");
// const verifyToken = require("../middleware/auth");

// // POST - create a Master Plan
// router.post("/plan/master", verifyToken, createMasterPlan);

// // GET - get all Master Plans
// router.get("/plan/master", verifyToken, getMasterPlans);

// module.exports = router;



// const express = require("express");
// const router = express.Router();
// const verifyToken = require("../middleware/auth");
// const { createMasterPlan, getMasterPlans } = require("../controllers/planController");

// // Create new master plan (protected)
// router.post("/plan/master", verifyToken, createMasterPlan);

// // Get all master plans (protected)
// router.get("/plan/master", verifyToken, getMasterPlans);

// module.exports = router;



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

// CREATE
router.post("/plan/master", verifyToken, createMasterPlan);

// READ
router.get("/plan/master", verifyToken, getMasterPlans);

// UPDATE
router.put("/plan/master/:id", verifyToken, updateMasterPlan);

// DELETE
router.delete("/plan/master/:id", verifyToken, deleteMasterPlan);

// EMAIL NOTIFICATION FOR PLAN
router.post("/notifications/milestone-deadline", verifyToken, sendMilestoneDeadlineEmail);

module.exports = router;
