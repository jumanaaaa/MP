const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getCalendarEvents } = require("../controllers/calendarController");

console.log("📅 Calendar routes loaded"); 

router.get("/events", (req, res, next) => {
  console.log("🔵 /calendar/events HIT!");
  next();
}, auth(), getCalendarEvents);

module.exports = router;