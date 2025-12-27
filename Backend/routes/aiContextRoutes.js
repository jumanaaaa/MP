const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const {
  getUserAIContext,
  createDomain,
  createContext,
  addContextResource,
  getAdminAIStructure,
  deleteContextResource,
  clearUserContexts,
  assignContextToUser
} = require("../controllers/aiContextController");

router.get("/ai/context", verifyToken(), getUserAIContext);

router.post("/ai/domains", verifyToken(["admin"]), createDomain);
router.post("/ai/contexts", verifyToken(["admin"]), createContext);
router.post("/ai/context-resources", verifyToken(["admin"]), addContextResource);
router.get(
  "/ai/admin/structure",
  verifyToken(["admin"]),
  getAdminAIStructure
);
router.delete("/ai/context-resources/:id", verifyToken(["admin"]), deleteContextResource);

router.delete("/ai/context-clear/:userId", verifyToken(["admin"]), clearUserContexts);
router.post("/ai/context-assign", verifyToken(["admin"]), assignContextToUser);

module.exports = router;