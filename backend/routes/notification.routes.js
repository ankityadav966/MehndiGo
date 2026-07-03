const express = require("express");
const router = express.Router();
const NotificationController = require("../controllers/notification/notification.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

// Client device registration
router.post("/register-token", authenticate, NotificationController.registerToken);
router.delete("/remove-token", authenticate, NotificationController.removeToken);

// Client notification history
router.get("/history", authenticate, NotificationController.getHistory);
router.put("/read", authenticate, NotificationController.markRead);
router.put("/read-all", authenticate, NotificationController.markAllRead);
router.delete("/clear-all", authenticate, NotificationController.clearAll);
router.delete("/:id", authenticate, NotificationController.deleteNotification);

// Admin-only routing actions
router.post("/send", authenticate, authorize("ADMIN"), NotificationController.sendSystemNotification);
router.post("/broadcast", authenticate, authorize("ADMIN"), NotificationController.sendBroadcast);
router.post("/schedule", authenticate, authorize("ADMIN"), NotificationController.scheduleNotification);

module.exports = router;
