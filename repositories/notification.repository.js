
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

    return await db
      .Notification
      .create(data);
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
