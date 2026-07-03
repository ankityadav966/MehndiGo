const express = require("express");
const router = express.Router();
const ChatController = require("../controllers/chat/chat.controller");
const { authenticate } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

// Chat Room preferences & directories
router.get("/list", authenticate, ChatController.getChatList);
router.get("/media", authenticate, ChatController.getMediaHistory);
router.put("/room/pin-archive", authenticate, ChatController.pinOrArchiveRoom);

// Message operations
router.get("/:bookingId", authenticate, ChatController.getChatHistory);
router.post("/send", authenticate, ChatController.sendMessage);
router.put("/read", authenticate, ChatController.markChatAsRead);
router.delete("/message/:id", authenticate, ChatController.deleteMessage);
router.put("/message/edit", authenticate, ChatController.editMessage);

// Media & file uploads
router.post("/upload", authenticate, upload.single("file"), ChatController.uploadMedia);

// Moderation & security blocking
router.post("/report", authenticate, ChatController.reportUser);
router.post("/block", authenticate, ChatController.blockUser);

module.exports = router;
