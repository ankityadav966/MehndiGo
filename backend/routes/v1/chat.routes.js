const express = require("express");
const router = express.Router();
const ChatController = require("../../controllers/chat/chat.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const upload = require("../../middleware/upload.middleware");

// Legacy direct user chat support
router.get("/unread/counts", authenticate, ChatController.getUnreadCounts);
router.put("/seen/:senderId", authenticate, ChatController.markChatAsSeen);
router.get("/:receiverId", authenticate, ChatController.getChatHistory);
router.post("/send", authenticate, ChatController.sendMessage);

// Booking-wise rich chat module APIs
router.get("/list", authenticate, ChatController.getChatList);
router.get("/media", authenticate, ChatController.getMediaHistory);
router.put("/room/pin-archive", authenticate, ChatController.pinOrArchiveRoom);
router.put("/read", authenticate, ChatController.markChatAsRead);
router.delete("/message/:id", authenticate, ChatController.deleteMessage);
router.put("/message/edit", authenticate, ChatController.editMessage);
router.post("/upload", authenticate, upload.single("file"), ChatController.uploadMedia);
router.post("/report", authenticate, ChatController.reportUser);
router.post("/block", authenticate, ChatController.blockUser);

module.exports = router;
