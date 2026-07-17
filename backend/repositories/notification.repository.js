
const db =
  require("../models");

const CrudRepository =
  require("./crud.repository");



class NotificationRepository
  extends CrudRepository {

  constructor() {

    super(
      db.Notification
    );
  }



  // create notification

  async createNotification(
    data
  ) {
    const notification = await db.Notification.create(data);

    try {
      const user = await db.User.findByPk(data.user_id);
      if (user) {
        const title = data.title;
        const msg = data.message;

        if (user.role === "ADMIN") {
          const { sendEmail } = require("../utils/mail.service");
          const adminEmail = user.email || process.env.EMAIL_USER || "admin@mehndigo.com";
          await sendEmail(adminEmail, `MehndiGo Admin Alert: ${title}`, msg).catch(err => {
            console.error("Failed to send admin email:", err.message);
          });
        } else {
          const { sendEmail } = require("../utils/mail.service");
          if (user.email) {
            await sendEmail(user.email, `MehndiGo Alert: ${title}`, msg).catch(err => {
              console.error("Failed to send email:", err.message);
            });
          }
        }
      }
    } catch (err) {
      console.error("Error in notification dispatch:", err.message);
    }

    return notification;
  }



  // get user notifications

  async getUserNotifications(
    user_id
  ) {

    return await db
      .Notification
      .findAll({

        where: {
          user_id,
        },

        order: [
          ["createdAt", "DESC"],
        ],
      });
  }



  // mark as read

  async markAsRead(
    id
  ) {

    return await db
      .Notification
      .update(

        {
          is_read: true,
        },

        {
          where: {
            id,
          },
        }
      );
  }
}

module.exports =
  NotificationRepository;
