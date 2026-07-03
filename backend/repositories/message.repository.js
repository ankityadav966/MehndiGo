const { Op } = require("sequelize");

const { Message, User } = require("../models");

class MessageRepository {
  async create(data) {
    return await Message.create(data);
  }

  async getChat(
    sender_id,

    receiver_id,
  ) {
    return await Message.findAll({
      where: {
        [Op.or]: [
          {
            sender_id,

            receiver_id,
          },

          {
            sender_id: receiver_id,

            receiver_id: sender_id,
          },
        ],
      },

      include: [
        {
          model: User,

          as: "sender",

          attributes: ["id", "name"],
        },
      ],

      order: [["createdAt", "ASC"]],
    });
  }
}

module.exports = MessageRepository;
