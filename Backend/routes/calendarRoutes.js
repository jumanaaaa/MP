const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getCalendarEvents } = require("../controllers/calendarController");

router.get("/events", auth, getCalendarEvents);

module.exports = router;
