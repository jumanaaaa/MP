const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth"); // 🟢 Add this line
const { getAISuggestions } = require("../controllers/ollamaController");

// Secure route with JWT
router.post("/recommend", verifyToken(), getAISuggestions);

module.exports = router;
