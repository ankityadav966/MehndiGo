const express = require("express");
const router = express.Router();
const ChatController = require("../../controller/chat.controller");
const { authenticate } = require("../../middleware/auth.middleware");

router.get("/unread/counts", authenticate, ChatController.getUnreadCounts);
router.put("/seen/:senderId", authenticate, ChatController.markChatAsSeen);
router.get("/:receiverId", authenticate, ChatController.getChatHistory);
router.post("/send", authenticate, ChatController.sendMessage);

module.exports = router;
