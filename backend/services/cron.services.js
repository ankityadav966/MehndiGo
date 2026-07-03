const db = require("../models");
const { Op } = require("sequelize");

async function checkAndSendScheduledNotifications() {
  try {
    const now = new Date();

    // Find all pending notifications scheduled for now or earlier
    const pendingList = await db.ScheduledNotification.findAll({
      where: {
        status: "PENDING",
        scheduled_at: {
          [Op.lte]: now
        }
      }
    });

    if (pendingList.length === 0) return;

    console.log(`[Scheduler] Processing ${pendingList.length} scheduled notifications...`);

    for (const item of pendingList) {
      try {
        let targets = [];

        if (item.user_id) {
          targets = [{ id: item.user_id }];
        } else {
          // If no specific user, parse payload data target users (e.g. ALL, CUSTOMERS, ARTISTS)
          let targetGroup = "ALL";
          try {
            const parsedData = item.data ? JSON.parse(item.data) : {};
            targetGroup = parsedData.target || "ALL";
          } catch (e) { }

          if (targetGroup === "CUSTOMERS") {
            targets = await db.User.findAll({ where: { role: "USER" }, attributes: ["id"] });
          } else if (targetGroup === "ARTISTS") {
            targets = await db.User.findAll({ where: { role: "ARTIST" }, attributes: ["id"] });
          } else {
            targets = await db.User.findAll({ attributes: ["id"] });
          }
        }

        // Create individual notification records (triggers afterCreate push hook automatically)
        await Promise.all(
          targets.map((t) =>
            db.Notification.create({
              user_id: t.id,
              title: item.title,
              message: item.message,
              type: "SYSTEM",
              is_read: false
            })
          )
        );

        // Update scheduled state
        await item.update({ status: "SENT" });

      } catch (err) {
        console.error(`[Scheduler] Error processing scheduled notification #${item.id}:`, err.message);
      }
    }
  } catch (error) {
    console.error("================================");
    console.error("[Scheduler] POLLING ERROR");
    console.error(error);
    console.error(error.stack);
    console.error("================================");
  }
}

let cronInterval = null;

function startScheduler() {
  if (cronInterval) return;
  console.log("[Scheduler] Push Notification scheduler initialized (polling every 60s)");

  // Run once immediately on start, then run every 60 seconds
  checkAndSendScheduledNotifications();
  cronInterval = setInterval(checkAndSendScheduledNotifications, 60000);
}

function stopScheduler() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log("[Scheduler] Push Notification scheduler stopped");
  }
}

module.exports = {
  startScheduler,
  stopScheduler
};
