const MessageRepository = require("../repositories/message.repository");
const { SuccessResponse, ErrorResponse } = require("../utils/common");
const db = require("../models");

const MessageRepositor = new MessageRepository();

async function getChatHistory(req, res) {
  try {
    const senderId = req.user.id;
    const receiverId = req.params.receiverId;

    if (!receiverId) {
      return res.status(400).json(ErrorResponse("Receiver ID is required"));
    }

    const messages = await MessageRepositor.getChat(senderId, receiverId);
    return res.status(200).json(SuccessResponse("Chat history retrieved", messages));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function sendMessage(req, res) {
  try {
    const senderId = req.user.id;
    const { receiver_id, message } = req.body;

    if (!receiver_id || !message) {
      return res.status(400).json(ErrorResponse("Receiver ID and message content are required"));
    }

    const newMessage = await MessageRepositor.create({
      sender_id: senderId,
      receiver_id,
      message,
    });

    return res.status(201).json(SuccessResponse("Message sent", newMessage));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getUnreadCounts(req, res) {
  try {
    const userId = req.user.id;
    const unread = await db.Message.findAll({
      where: {
        receiver_id: userId,
        is_read: false
      },
      attributes: [
        "sender_id",
        [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"]
      ],
      group: ["sender_id"]
    });
    return res.status(200).json(SuccessResponse("Unread counts fetched", unread));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function markChatAsSeen(req, res) {
  try {
    const userId = req.user.id;
    const senderId = req.params.senderId;

    if (!senderId) {
      return res.status(400).json(ErrorResponse("Sender ID is required"));
    }

    await db.Message.update(
      { is_read: true },
      {
        where: {
          sender_id: senderId,
          receiver_id: userId,
          is_read: false
        }
      }
    );

    return res.status(200).json(SuccessResponse("Chat marked as seen"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  getChatHistory,
  sendMessage,
  getUnreadCounts,
  markChatAsSeen,
};
