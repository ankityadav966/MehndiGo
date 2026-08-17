const db = require("../models");
const { Op } = require("sequelize");

/**
 * Intelligent Multi-Stage Booking Calendar Reminder Engine
 * Evaluates active confirmed bookings and dispatches reminders at key milestone stages:
 * - 30 Days Before
 * - 15 Days Before
 * - 7 Days Before
 * - 3 Days Before
 * - 1 Day Before (Tomorrow)
 * - Booking Day (Today)
 * - 2 Hours Before Appointment
 */
async function checkAndSendReminders() {
  try {
    const now = new Date();
    const nowMs = now.getTime();

    // 1. Fetch all active confirmed / upcoming bookings
    const activeBookings = await db.Booking.findAll({
      where: {
        booking_status: { [Op.in]: ["CONFIRMED", "ACCEPTED"] },
        detailed_status: { [Op.notIn]: ["COMPLETED", "COMPLETED_CLOSED", "CANCELLED"] }
      },
      include: [
        { model: db.AvailabilitySlot, as: "slot", required: false },
        { model: db.User, as: "user", attributes: ["id", "name", "phone", "email"], required: false },
        { model: db.ArtistProfile, as: "artist", attributes: ["id", "user_id"], required: false }
      ]
    });

    for (const booking of activeBookings) {
      // Determine scheduled start timestamp
      let scheduledStartMs = null;
      if (booking.slot && booking.slot.start_time) {
        scheduledStartMs = new Date(booking.slot.start_time).getTime();
      } else if (booking.booking_date) {
        const timeStr = booking.booking_time || "10:00 AM";
        let hour = 10;
        let minute = 0;
        if (timeStr.includes("PM") && !timeStr.startsWith("12")) hour += 12;
        if (timeStr.startsWith("12") && timeStr.includes("AM")) hour = 0;
        scheduledStartMs = new Date(`${booking.booking_date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`).getTime();
      }

      if (!scheduledStartMs || isNaN(scheduledStartMs)) continue;

      const diffMs = scheduledStartMs - nowMs;
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = Math.floor(diffHours / 24);

      // Determine appropriate stage
      let stage = null;
      let title = null;
      let customerMsg = null;
      let artistMsg = null;

      if (diffHours <= 2 && diffHours > 0) {
        stage = "STAGE_2_HOURS";
        title = "Appointment in 2 Hours! ⏰";
        customerMsg = `Your Mehndi booking #${booking.booking_code} is scheduled in 2 hours. Your artist is preparing to travel.`;
        artistMsg = `Reminder: Booking #${booking.booking_code} starts in 2 hours. Please prepare for travel.`;
      } else if (diffDays === 0 && diffHours > 2) {
        stage = "STAGE_TODAY";
        title = "Your Mehndi Booking is Today! 🌸";
        customerMsg = `Your Mehndi booking #${booking.booking_code} is scheduled for today at ${booking.booking_time || "scheduled time"}.`;
        artistMsg = `Today's Appointment: Booking #${booking.booking_code} is scheduled for today at ${booking.booking_time || "scheduled time"}.`;
      } else if (diffDays === 1) {
        stage = "STAGE_1_DAY";
        title = "Mehndi Appointment Tomorrow 🗓️";
        customerMsg = `Reminder: Your Mehndi booking #${booking.booking_code} is scheduled for tomorrow.`;
        artistMsg = `Reminder: You have an appointment tomorrow for booking #${booking.booking_code}.`;
      } else if (diffDays === 3) {
        stage = "STAGE_3_DAYS";
        title = "3 Days to Your Mehndi Appointment ✨";
        customerMsg = `Your booking #${booking.booking_code} is coming up in 3 days.`;
        artistMsg = `Upcoming Booking: Booking #${booking.booking_code} in 3 days.`;
      } else if (diffDays === 7) {
        stage = "STAGE_7_DAYS";
        title = "1 Week to Your Mehndi Booking 🗓️";
        customerMsg = `Your Mehndi booking #${booking.booking_code} is in 1 week.`;
        artistMsg = `Upcoming Booking: #${booking.booking_code} in 1 week.`;
      } else if (diffDays === 15) {
        stage = "STAGE_15_DAYS";
        title = "15 Days to Your Mehndi Appointment 🌸";
        customerMsg = `Your Mehndi booking #${booking.booking_code} is scheduled in 15 days.`;
        artistMsg = `Advance Booking Reminder: #${booking.booking_code} in 15 days.`;
      } else if (diffDays === 30) {
        stage = "STAGE_30_DAYS";
        title = "Advance Mehndi Booking Reminder 💍";
        customerMsg = `Your wedding/special occasion booking #${booking.booking_code} is in 30 days.`;
        artistMsg = `Advance Booking Reminder: #${booking.booking_code} in 30 days.`;
      }

      if (!stage) continue;

      // Check if this specific stage was already sent
      const alreadySent = await db.ReminderLog.findOne({
        where: {
          booking_id: booking.id,
          reminder_type: stage
        }
      }).catch(() => null);

      if (!alreadySent) {
        // Dispatch Notification to Customer
        if (booking.user_id) {
          await db.Notification.create({
            user_id: booking.user_id,
            title,
            message: customerMsg,
            type: "BOOKING",
            data: JSON.stringify({ bookingId: booking.id, stage, type: "reminder" })
          }).catch(() => {});
        }

        // Dispatch Notification to Artist
        if (booking.artist && booking.artist.user_id) {
          await db.Notification.create({
            user_id: booking.artist.user_id,
            title,
            message: artistMsg,
            type: "BOOKING",
            data: JSON.stringify({ bookingId: booking.id, stage, type: "reminder" })
          }).catch(() => {});
        }

        // Record in ReminderLog to prevent duplicate notifications for this stage
        await db.ReminderLog.create({
          booking_id: booking.id,
          reminder_type: stage,
          last_sent_at: new Date()
        }).catch(() => {});

        console.log(`[ReminderWorker] Dispatched ${stage} reminder for Booking #${booking.booking_code}`);
      }
    }

    // 2. Action item reminders (Pending Cash confirmation, Pending payment)
    const pendingActions = await db.Booking.findAll({
      where: {
        booking_status: { [Op.ne]: "CANCELLED" },
        detailed_status: { [Op.in]: ["AWAITING_CASH_CONFIRMATION"] }
      }
    });

    for (const booking of pendingActions) {
      const lastActionLog = await db.ReminderLog.findOne({
        where: { booking_id: booking.id, reminder_type: "CASH_CONFIRMATION" },
        order: [["createdAt", "DESC"]]
      }).catch(() => null);

      const lastSentTime = lastActionLog ? new Date(lastActionLog.last_sent_at).getTime() : 0;
      if (nowMs - lastSentTime >= 2 * 60 * 60 * 1000) { // Every 2 hours
        const artistProfile = await db.ArtistProfile.findByPk(booking.artist_id);
        if (artistProfile && artistProfile.user_id) {
          await db.Notification.create({
            user_id: artistProfile.user_id,
            title: "Cash Payment Confirmation Required 💵",
            message: `Please confirm cash payment of ₹${booking.remaining_amount || booking.final_amount} for booking #${booking.booking_code}.`,
            type: "PAYMENT",
            data: JSON.stringify({ bookingId: booking.id, action: "confirm_cash" })
          }).catch(() => {});

          if (lastActionLog) {
            await lastActionLog.update({ last_sent_at: new Date() });
          } else {
            await db.ReminderLog.create({
              booking_id: booking.id,
              reminder_type: "CASH_CONFIRMATION",
              last_sent_at: new Date()
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("[ReminderWorker] Error in reminder worker check:", err.message);
  }
}

module.exports = {
  checkAndSendReminders
};
