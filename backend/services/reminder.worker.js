const db = require("../models");
const { Op } = require("sequelize");

async function checkAndSendReminders() {
  try {
    const intervalSetting = await db.SystemSetting.findOne({ where: { key: "REMINDER_INTERVAL_HOURS" } });
    const intervalHours = intervalSetting ? parseInt(intervalSetting.value) : 1;
    const intervalMs = intervalHours * 60 * 60 * 1000;

    const pendingBookings = await db.Booking.findAll({
      where: {
        booking_status: { [Op.ne]: "CANCELLED" },
        detailed_status: { [Op.notIn]: ["COMPLETED_CLOSED"] },
        [Op.or]: [
          { payment_status: "PENDING" },
          { detailed_status: "AWAITING_CASH_CONFIRMATION" },
          { detailed_status: "COMPLETED" }
        ]
      }
    });

    const now = Date.now();

    for (const booking of pendingBookings) {
      const lastLog = await db.ReminderLog.findOne({
        where: { booking_id: booking.id },
        order: [["createdAt", "DESC"]]
      });

      const lastSentTime = lastLog ? new Date(lastLog.last_sent_at).getTime() : 0;

      if (now - lastSentTime >= intervalMs) {
        let title = "Booking Pending Attention 📅";
        let message = `Please complete the actions for booking #${booking.booking_code}.`;
        let userToNotify = booking.user_id;

        if (booking.detailed_status === "AWAITING_CASH_CONFIRMATION") {
          const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
          if (artistProfile) {
            userToNotify = artistProfile.user_id;
            title = "Cash Payment Confirmation Required 💵";
            message = `Please confirm cash payment of ₹${booking.final_amount} for booking #${booking.booking_code}.`;
          }
        } else if (booking.payment_status === "PENDING") {
          title = "Booking Payment Pending 💳";
          message = `Please complete the payment for your Mehndi booking #${booking.booking_code}.`;
        } else if (booking.detailed_status === "COMPLETED") {
          title = "Share Your Feedback 🌟";
          message = `Please submit a review or skip feedback for booking #${booking.booking_code} to settle and close it.`;
        }

        await db.Notification.create({
          user_id: userToNotify,
          title,
          message,
          type: "SYSTEM"
        });

        if (lastLog) {
          await lastLog.update({ last_sent_at: new Date() });
        } else {
          await db.ReminderLog.create({
            booking_id: booking.id,
            last_sent_at: new Date()
          });
        }

        console.log(`[ReminderWorker] Sent reminder to user ID ${userToNotify} for booking #${booking.booking_code}`);
      }
    }
  } catch (err) {
    console.error("[ReminderWorker] Error in reminder worker check:", err.message);
  }
}

module.exports = {
  checkAndSendReminders
};
