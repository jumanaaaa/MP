const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");

const {
  getUserNotifications,
  deleteNotification
} = require("../controllers/notificationController");

router.get("/", verifyToken(), getUserNotifications);
router.delete("/:id", verifyToken(), deleteNotification);

module.exports = router;
