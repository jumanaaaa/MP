const express = require("express");
const { getAISuggestions } = require("../controllers/ollamaController");

const router = express.Router();
router.post("/recommend", getAISuggestions);

module.exports = router;
