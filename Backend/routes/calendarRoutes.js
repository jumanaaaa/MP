const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const { getCalendarEvents } = require("../controllers/calendarController");

console.log("📅 Calendar routes loaded"); 

router.get("/events", (req, res, next) => {
  console.log("🔵 /calendar/events HIT!");
  next();
}, verifyToken(), getCalendarEvents);

module.exports = router;