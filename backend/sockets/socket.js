const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const db = require("../models");
const { Op } = require("sequelize");

let io;
const onlineUsers = new Map(); // userId (string) -> Set of socket.id (strings)

// Helper to get active booking-wise authorization context for socket connection
async function getChatAuthContext(userId, bookingId) {
  const booking = await db.Booking.findOne({
    where: { id: bookingId },
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "name", "profile_image", "hide_last_seen", "last_login_at"]
      },
      {
        model: db.ArtistProfile,
        as: "artist",
        include: [{ model: db.User, as: "user", attributes: ["id", "name", "profile_image", "hide_last_seen", "last_login_at"] }]
      }
    ]
  });

  if (!booking) return null;

  const isCustomer = booking.user_id === userId;
  const artistUserId = booking.artist?.user_id;
  const isArtist = artistUserId === userId;

  if (!isCustomer && !isArtist) return null;

  const status = booking.detailed_status || booking.booking_status;
  const allowedStatuses = ["CONFIRMED", "ARTIST_ACCEPTED", "ARTIST_ON_THE_WAY", "SERVICE_STARTED"];
  const isConfirmed = allowedStatuses.includes(status);
  const isCompleted = status === "COMPLETED";

  let active = isConfirmed;
  if (isCompleted) {
    const completionTime = new Date(booking.updatedAt).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - completionTime < sevenDaysMs) {
      active = true;
    }
  }

  const otherUser = isCustomer ? booking.artist?.user : booking.user;

  return {
    booking,
    isCustomer,
    isArtist,
    otherUserId: otherUser?.id,
    otherUser,
    active
  };
}

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  // Socket Middleware: Validate JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
      if (!token) {
        return next(new Error("Authentication error: Token missing"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "Live credentials");
      socket.user = decoded; // decoded contains { id, role }
      next();
    } catch (err) {
      return next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const currentUserId = socket.user.id.toString();
    console.log(`User connected: ${currentUserId} (socket ID: ${socket.id})`);

    // Register active user socket ID
    if (!onlineUsers.has(currentUserId)) {
      onlineUsers.set(currentUserId, new Set());
    }
    onlineUsers.get(currentUserId).add(socket.id);

    // Auto-join user to their own personal room (for direct notifications)
    socket.join(currentUserId);

    // Broadcast online status (unless they prefer privacy)
    (async () => {
      try {
        const user = await db.User.findByPk(currentUserId);
        if (user && !user.hide_last_seen) {
          io.emit("user_status", { userId: currentUserId, status: "online" });
        }
      } catch (e) {
        console.error("Error fetching user privacy settings on connect:", e);
      }
    })();

    // 1. Join room (booking-wise chat)
    socket.on("join-room", async ({ bookingId }) => {
      if (!bookingId) return;

      try {
        const auth = await getChatAuthContext(socket.user.id, bookingId);
        if (!auth) {
          socket.emit("error", { message: "Unauthorized access to this chat room" });
          return;
        }

        const roomName = `booking_room_${bookingId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} (user ${currentUserId}) joined chat room: ${roomName}`);

        // Emit online status of the other user to the joiner
        const otherUserIdStr = auth.otherUserId.toString();
        const otherUserPrivacy = auth.otherUser?.hide_last_seen;
        const isOtherOnline = onlineUsers.has(otherUserIdStr) && onlineUsers.get(otherUserIdStr).size > 0;

        socket.emit("user_status", {
          userId: auth.otherUserId,
          status: (isOtherOnline && !otherUserPrivacy) ? "online" : "offline",
          lastSeen: auth.otherUser?.last_login_at
        });
      } catch (err) {
        console.error("Error joining socket room:", err);
      }
    });

    // 2. Leave room
    socket.on("leave-room", ({ bookingId }) => {
      if (!bookingId) return;
      const roomName = `booking_room_${bookingId}`;
      socket.leave(roomName);
      console.log(`Socket ${socket.id} (user ${currentUserId}) left room: ${roomName}`);
    });

    // 3. Send message
    socket.on("send-message", async (data) => {
      const { bookingId, message, message_type, parent_message_id, media } = data;

      try {
        const auth = await getChatAuthContext(socket.user.id, bookingId);
        if (!auth) {
          socket.emit("error", { message: "Unauthorized or closed chat room" });
          return;
        }

        if (!auth.active) {
          socket.emit("error", { message: "This chat room is closed" });
          return;
        }

        // Save to Database
        const savedMsg = await db.Message.create({
          sender_id: socket.user.id,
          receiver_id: auth.otherUserId,
          booking_id: bookingId,
          message: message || "",
          message_type: message_type || "TEXT",
          parent_message_id: parent_message_id || null,
          is_read: false
        });

        if (media) {
          await db.MessageMedia.create({
            message_id: savedMsg.id,
            file_url: media.file_url,
            file_type: media.file_type,
            file_size: media.file_size,
            duration: media.duration,
            waveform: media.waveform ? JSON.stringify(media.waveform) : null
          });
        }

        const completeMsg = await db.Message.findByPk(savedMsg.id, {
          include: [
            { model: db.MessageMedia, as: "media" },
            { model: db.Message, as: "parentMessage", include: [{ model: db.MessageMedia, as: "media" }] }
          ]
        });

        const roomName = `booking_room_${bookingId}`;
        
        // Emit to the entire room (including sender)
        io.to(roomName).emit("receive-message", completeMsg);

        // Notify sender confirmation
        socket.emit("message_saved", completeMsg);

        // Check if receiver is online, then emit dynamic unread count update
        const otherUserIdStr = auth.otherUserId.toString();
        if (onlineUsers.has(otherUserIdStr) && onlineUsers.get(otherUserIdStr).size > 0) {
          io.to(otherUserIdStr).emit("unread_update", {
            bookingId,
            unreadCount: 1
          });
        }

        // Push / In-App Notification seeding
        await db.Notification.create({
          user_id: auth.otherUserId,
          title: `New Message from ${socket.user.name || "User"}`,
          message: message_type === "TEXT" ? message : `Sent an attachment: ${message_type}`,
          type: "CHAT",
          booking_id: bookingId
        });

      } catch (err) {
        console.error("Error processing socket send-message:", err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // 4. Typing indicators
    socket.on("typing", ({ bookingId }) => {
      if (!bookingId) return;
      socket.to(`booking_room_${bookingId}`).emit("typing", {
        bookingId,
        userId: socket.user.id
      });
    });

    socket.on("stop-typing", ({ bookingId }) => {
      if (!bookingId) return;
      socket.to(`booking_room_${bookingId}`).emit("stop-typing", {
        bookingId,
        userId: socket.user.id
      });
    });

    // 5. Mark messages as read/seen
    socket.on("message-read", async ({ bookingId }) => {
      if (!bookingId) return;

      try {
        await db.Message.update(
          { is_read: true },
          {
            where: {
              booking_id: bookingId,
              receiver_id: socket.user.id,
              is_read: false
            }
          }
        );

        // Notify sender that receiver read the messages
        socket.to(`booking_room_${bookingId}`).emit("messages_read", {
          bookingId,
          readerId: socket.user.id
        });
      } catch (err) {
        console.error("Error updating message read status via socket:", err);
      }
    });

    // 6. Upload progress reporting
    socket.on("upload-progress", ({ bookingId, progress }) => {
      if (!bookingId) return;
      socket.to(`booking_room_${bookingId}`).emit("upload-progress", {
        bookingId,
        progress,
        userId: socket.user.id
      });
    });

    // 7. Disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${currentUserId} (socket ID: ${socket.id})`);
      
      const userSockets = onlineUsers.get(currentUserId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(currentUserId);

          // Update last seen in DB
          db.User.update(
            { last_login_at: new Date() },
            { where: { id: socket.user.id } }
          ).catch(e => console.error("Error updating user last seen on disconnect:", e));

          // Broadcast offline status (unless privacy option is on)
          (async () => {
            try {
              const user = await db.User.findByPk(socket.user.id);
              if (user && !user.hide_last_seen) {
                io.emit("user_status", {
                  userId: currentUserId,
                  status: "offline",
                  lastSeen: new Date()
                });
              }
            } catch (e) {
              console.error("Error fetching user privacy settings on disconnect:", e);
            }
          })();
        }
      }
    });
  });
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

module.exports = {
  initSocket,
  getIO,
};
