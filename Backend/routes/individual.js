// const express = require("express");
// const router = express.Router();
// const verifyToken = require("../middleware/auth");
// const individualController = require("../controllers/individualController");

// // Create Individual Plan
// router.post("/plan/individual", verifyToken, individualController.createIndividualPlan);

// // Get all Individual Plans
// router.get("/plan/individual", verifyToken, individualController.getIndividualPlans);

// module.exports = router;



const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const individualController = require("../controllers/individualController");

// CREATE
router.post("/plan/individual", verifyToken, individualController.createIndividualPlan);

// READ
router.get("/plan/individual", verifyToken, individualController.getIndividualPlans);

// UPDATE
router.put("/plan/individual/:id", verifyToken, individualController.updateIndividualPlan);

// DELETE
router.delete("/plan/individual/:id", verifyToken, individualController.deleteIndividualPlan);

module.exports = router;
