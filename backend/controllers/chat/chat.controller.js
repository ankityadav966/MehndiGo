const db = require("../../models");
const { Op } = require("sequelize");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");
const { getIO } = require("../../sockets/socket");
const cloudinary = require("../../config/cloudinary");

// Helper to get active booking-wise authorization context
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
      },
      {
        model: db.Service,
        as: "service",
        attributes: ["specialization_name"]
      }
    ]
  });

  if (!booking) return null;

  const isCustomer = booking.user_id === userId;
  const artistUserId = booking.artist?.user_id;
  const isArtist = artistUserId === userId;

  if (!isCustomer && !isArtist) return null;

  const otherUser = isCustomer ? booking.artist?.user : booking.user;

  // Check if blocked by either user
  let isUserBlocked = false;
  if (otherUser) {
    const blockedCheck = await db.BlockedUser.findOne({
      where: {
        [Op.or]: [
          { blocker_id: userId, blocked_id: otherUser.id },
          { blocker_id: otherUser.id, blocked_id: userId }
        ]
      }
    });
    if (blockedCheck) {
      isUserBlocked = true;
    }
  }

  // Enforce booking status constraint
  const status = booking.detailed_status || booking.booking_status;
  const allowedStatuses = ["CONFIRMED", "ARTIST_ACCEPTED", "ARTIST_ON_THE_WAY", "SERVICE_STARTED", "RESCHEDULED"];
  const isConfirmed = allowedStatuses.includes(status);
  const isCompleted = status === "COMPLETED";

  const reviewCount = await db.Review.count({ where: { booking_id: bookingId } });
  const hasReviewed = reviewCount > 0;
  const isSkipped = booking.review_skipped || false;

  // Check 7 days completion grace period or review completion
  let active = isConfirmed && !isUserBlocked;
  if (isCompleted && !isUserBlocked) {
    if (hasReviewed || isSkipped) {
      active = false;
    } else {
      const completionTime = new Date(booking.updatedAt).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - completionTime < sevenDaysMs) {
        active = true;
      } else {
        active = false;
      }
    }
  }

  return {
    booking,
    isCustomer,
    isArtist,
    otherUserId: otherUser?.id,
    otherUser,
    active,
    isBlocked: isUserBlocked
  };
}

// Check if blocked
async function isBlocked(user1, user2) {
  const block = await db.BlockedUser.findOne({
    where: {
      [Op.or]: [
        { blocker_id: user1, blocked_id: user2 },
        { blocker_id: user2, blocked_id: user1 }
      ]
    }
  });
  return !!block;
}

// 1. GET /chat/list
async function getChatList(req, res) {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const chatList = [];

    // Custom flow for Admin
    if (role === "ADMIN") {
      const messages = await db.Message.findAll({
        where: {
          booking_id: null,
          [Op.or]: [
            { sender_id: userId },
            { receiver_id: userId }
          ]
        },
        order: [["createdAt", "DESC"]]
      });

      const uniqueArtistIds = [];
      const artistLastMessages = {};
      const artistUnreadCounts = {};

      for (const msg of messages) {
        const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        if (!uniqueArtistIds.includes(otherId)) {
          uniqueArtistIds.push(otherId);
          artistLastMessages[otherId] = msg;
        }
        if (msg.receiver_id === userId && !msg.is_read) {
          artistUnreadCounts[otherId] = (artistUnreadCounts[otherId] || 0) + 1;
        }
      }

      for (const artistId of uniqueArtistIds) {
        const artistUser = await db.User.findByPk(artistId, {
          attributes: ["id", "name", "profile_image", "hide_last_seen", "last_login_at"]
        });
        if (artistUser && artistUser.role === "ARTIST") {
          const lastMsg = artistLastMessages[artistId];
          chatList.push({
            bookingId: `admin_${artistUser.id}`,
            bookingCode: "ADMIN",
            serviceName: "Artist Chat",
            roomSettings: {
              isPinned: false,
              isArchived: false
            },
            recipient: {
              id: artistUser.id,
              name: artistUser.name,
              profileImage: artistUser.profile_image,
              hideLastSeen: artistUser.hide_last_seen,
              lastSeen: artistUser.last_login_at
            },
            lastMessage: {
              id: lastMsg.id,
              message: lastMsg.is_deleted_everyone ? "This message was deleted" : lastMsg.message,
              messageType: lastMsg.message_type,
              createdAt: lastMsg.createdAt,
              senderId: lastMsg.sender_id,
              isRead: lastMsg.is_read
            },
            unreadCount: artistUnreadCounts[artistId] || 0
          });
        }
      }
      return res.status(200).json(SuccessResponse("Chat list retrieved", chatList));
    }

    let bookingQuery = {};
    if (role === "ARTIST") {
      const artist = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      if (!artist) {
        return res.status(404).json(ErrorResponse("Artist profile not found"));
      }
      bookingQuery = { artist_id: artist.id };
    } else {
      bookingQuery = { user_id: userId };
    }

    // Fetch all bookings that are confirmed/completed
    const bookings = await db.Booking.findAll({
      where: {
        ...bookingQuery,
        booking_status: {
          [Op.in]: ["CONFIRMED", "COMPLETED"]
        }
      },
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
        },
        {
          model: db.Service,
          as: "service",
          attributes: ["id", "specialization_name"]
        }
      ],
      order: [["updatedAt", "DESC"]]
    });

    for (const b of bookings) {
      const status = b.detailed_status || b.booking_status;
      const isCompleted = status === "COMPLETED";

      // 7 days completion grace check & review check
      if (isCompleted) {
        const reviewCount = await db.Review.count({ where: { booking_id: b.id } });
        const hasReviewed = reviewCount > 0;
        const isSkipped = b.review_skipped || false;

        if (hasReviewed || isSkipped) {
          continue; // Skip closed chats
        }

        const completionTime = new Date(b.updatedAt).getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - completionTime >= sevenDaysMs) {
          continue; // Skip expired chats
        }
      }

      // Check / Auto-Create ChatRoom
      let [room] = await db.ChatRoom.findOrCreate({
        where: { booking_id: b.id },
        defaults: { booking_id: b.id }
      });

      // Filter archives / pins based on roles
      const isCustomer = b.user_id === userId;
      const isPinned = isCustomer ? room.is_pinned_customer : room.is_pinned_artist;
      const isArchived = isCustomer ? room.is_archived_customer : room.is_archived_artist;

      // Get last message
      const lastMessage = await db.Message.findOne({
        where: {
          booking_id: b.id,
          [Op.and]: [
            isCustomer ? { deleted_by_sender: false } : { deleted_by_receiver: false },
          ]
        },
        include: [{ model: db.MessageMedia, as: "media" }],
        order: [["createdAt", "DESC"]]
      });

      // Unread count
      const unreadCount = await db.Message.count({
        where: {
          booking_id: b.id,
          receiver_id: userId,
          is_read: false
        }
      });

      const recipient = isCustomer ? b.artist?.user : b.user;

      chatList.push({
        bookingId: b.id,
        bookingCode: b.booking_code,
        serviceName: b.service?.specialization_name,
        roomSettings: {
          isPinned,
          isArchived,
        },
        recipient: {
          id: recipient?.id,
          name: recipient?.name,
          profileImage: recipient?.profile_image,
          hideLastSeen: recipient?.hide_last_seen,
          lastSeen: recipient?.last_login_at
        },
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          message: lastMessage.is_deleted_everyone ? "This message was deleted" : lastMessage.message,
          messageType: lastMessage.message_type,
          createdAt: lastMessage.createdAt,
          senderId: lastMessage.sender_id,
          isRead: lastMessage.is_read
        } : null,
        unreadCount
      });
    }

    // For Artist, append Admin Support Chat if any messages exist
    if (role === "ARTIST") {
      const lastAdminMsg = await db.Message.findOne({
        where: {
          booking_id: null,
          [Op.or]: [
            { sender_id: userId },
            { receiver_id: userId }
          ]
        },
        order: [["createdAt", "DESC"]]
      });

      if (lastAdminMsg) {
        const adminId = lastAdminMsg.sender_id === userId ? lastAdminMsg.receiver_id : lastAdminMsg.sender_id;
        const adminUser = await db.User.findByPk(adminId, {
          attributes: ["id", "name", "profile_image", "hide_last_seen", "last_login_at"]
        });

        if (adminUser) {
          const unreadCount = await db.Message.count({
            where: {
              booking_id: null,
              receiver_id: userId,
              sender_id: adminId,
              is_read: false
            }
          });

          chatList.push({
            bookingId: `admin_${adminId}`,
            bookingCode: "ADMIN",
            serviceName: "Support Chat",
            roomSettings: {
              isPinned: false,
              isArchived: false
            },
            recipient: {
              id: adminUser.id,
              name: adminUser.name || "System Admin",
              profileImage: adminUser.profile_image,
              hideLastSeen: adminUser.hide_last_seen,
              lastSeen: adminUser.last_login_at
            },
            lastMessage: {
              id: lastAdminMsg.id,
              message: lastAdminMsg.is_deleted_everyone ? "This message was deleted" : lastAdminMsg.message,
              messageType: lastAdminMsg.message_type,
              createdAt: lastAdminMsg.createdAt,
              senderId: lastAdminMsg.sender_id,
              isRead: lastAdminMsg.is_read
            },
            unreadCount
          });
        }
      }
    }

    return res.status(200).json(SuccessResponse("Chat list retrieved", chatList));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 2. GET /chat/:bookingId (with fallback for legacy GET /chat/:receiverId)
async function getChatHistory(req, res) {
  try {
    const userId = req.user.id;
    let { bookingId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    let auth = await getChatAuthContext(userId, bookingId);

    // Legacy fallback: bookingId might actually be the receiverId
    if (!auth) {
      // Find latest confirmed booking between userId and the parameter (as receiverId)
      const receiverId = bookingId;
      const customerId = userId;
      const artist = await db.ArtistProfile.findOne({
        where: {
          user_id: { [Op.in]: [userId, receiverId] }
        }
      });
      if (artist) {
        const actualCustomerId = artist.user_id === userId ? receiverId : userId;
        const fallbackBooking = await db.Booking.findOne({
          where: {
            user_id: actualCustomerId,
            artist_id: artist.id,
            booking_status: { [Op.in]: ["CONFIRMED", "COMPLETED"] }
          },
          order: [["updatedAt", "DESC"]]
        });
        if (fallbackBooking) {
          bookingId = fallbackBooking.id;
          auth = await getChatAuthContext(userId, bookingId);
        }
      }
    }

    // Direct Admin-Artist chat authorization fallback (no booking ID)
    let isAdminArtist = false;
    let otherUserId = null;

    if (!auth) {
      let targetUserIdStr = bookingId;
      if (typeof bookingId === "string" && bookingId.startsWith("admin_")) {
        targetUserIdStr = bookingId.split("_")[1];
      }

      const otherUserIdParsed = parseInt(targetUserIdStr);
      if (!isNaN(otherUserIdParsed)) {
        const otherUser = await db.User.findByPk(otherUserIdParsed);
        if (otherUser) {
          const isUserAdmin = req.user.role === "ADMIN";
          const isUserArtist = req.user.role === "ARTIST";
          const isOtherAdmin = otherUser.role === "ADMIN";
          const isOtherArtist = otherUser.role === "ARTIST";

          if ((isUserAdmin && isOtherArtist) || (isUserArtist && isOtherAdmin)) {
            isAdminArtist = true;
            otherUserId = otherUser.id;
          }
        }
      }
    }

    if (isAdminArtist) {
      const messages = await db.Message.findAll({
        where: {
          booking_id: null,
          [Op.or]: [
            { sender_id: userId, receiver_id: otherUserId, deleted_by_sender: false },
            { sender_id: otherUserId, receiver_id: userId, deleted_by_receiver: false }
          ]
        },
        include: [
          { model: db.MessageMedia, as: "media" },
          { model: db.Message, as: "parentMessage", include: [{ model: db.MessageMedia, as: "media" }] }
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset
      });

      // Mark these as read
      await db.Message.update(
        { is_read: true },
        {
          where: {
            booking_id: null,
            sender_id: otherUserId,
            receiver_id: userId,
            is_read: false
          }
        }
      );

      // Notify via WebSocket
      const io = getIO();
      const virtualRoomId = `admin_${req.user.role === "ADMIN" ? otherUserId : userId}`;
      io.to(userId.toString()).to(otherUserId.toString()).emit("messages_read", {
        bookingId: virtualRoomId,
        readerId: userId,
        sender_id: otherUserId, // web compat
        receiver_id: userId // web compat
      });

      return res.status(200).json(SuccessResponse("Chat history retrieved", messages.reverse()));
    }

    if (!auth) {
      return res.status(403).json(ErrorResponse("You are not authorized to access this chat, or no active booking exists."));
    }

    const messages = await db.Message.findAll({
      where: {
        booking_id: bookingId,
        [Op.or]: [
          { sender_id: userId, deleted_by_sender: false },
          { receiver_id: userId, deleted_by_receiver: false }
        ]
      },
      include: [
        {
          model: db.MessageMedia,
          as: "media"
        },
        {
          model: db.Message,
          as: "parentMessage",
          include: [{ model: db.MessageMedia, as: "media" }]
        }
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    // Mark these as read
    await db.Message.update(
      { is_read: true },
      {
        where: {
          booking_id: bookingId,
          receiver_id: userId,
          is_read: false
        }
      }
    );

    // Notify other participant via WebSocket
    const io = getIO();
    io.to(`booking_room_${bookingId}`).emit("messages_read", {
      bookingId,
      readerId: userId
    });

    return res.status(200).json(SuccessResponse("Chat history retrieved", messages.reverse()));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 3. POST /chat/send (with fallback for legacy POST /chat/send with receiver_id)
async function sendMessage(req, res) {
  try {
    const userId = req.user.id;
    let { bookingId, receiver_id, message, message_type, messageType, parent_message_id, parentMessageId, media } = req.body;

    const finalMessageType = message_type || messageType || "TEXT";
    const finalParentMessageId = parent_message_id || parentMessageId || null;

    // Check if it is Admin-Artist chat request
    let isAdminArtist = false;
    let otherUserId = receiver_id;

    if (bookingId && typeof bookingId === "string" && bookingId.startsWith("admin_")) {
      otherUserId = parseInt(bookingId.split("_")[1]);
      bookingId = null;
    }

    if (!bookingId) {
      // Validate roles of sender and receiver
      if (otherUserId) {
        const otherUser = await db.User.findByPk(otherUserId);
        if (otherUser) {
          const isUserAdmin = req.user.role === "ADMIN";
          const isUserArtist = req.user.role === "ARTIST";
          const isOtherAdmin = otherUser.role === "ADMIN";
          const isOtherArtist = otherUser.role === "ARTIST";

          if ((isUserAdmin && isOtherArtist) || (isUserArtist && isOtherAdmin)) {
            isAdminArtist = true;
          }
        }
      }
    }

    if (isAdminArtist) {
      const blocked = await isBlocked(userId, otherUserId);
      if (blocked) {
        return res.status(403).json(ErrorResponse("Message blocked. Communication restricted."));
      }

      const newMsg = await db.Message.create({
        sender_id: userId,
        receiver_id: otherUserId,
        booking_id: null,
        message: message || "",
        message_type: finalMessageType,
        parent_message_id: finalParentMessageId,
        is_read: false
      });

      let savedMedia = null;
      if (media) {
        savedMedia = await db.MessageMedia.create({
          message_id: newMsg.id,
          file_url: media.file_url,
          file_type: media.file_type,
          file_size: media.file_size,
          duration: media.duration,
          waveform: media.waveform ? JSON.stringify(media.waveform) : null
        });
      }

      const completeMsg = await db.Message.findByPk(newMsg.id, {
        include: [
          { model: db.MessageMedia, as: "media" },
          { model: db.Message, as: "parentMessage", include: [{ model: db.MessageMedia, as: "media" }] }
        ]
      });

      // Emit via sockets
      const io = getIO();
      const virtualRoomId = `admin_${req.user.role === "ADMIN" ? otherUserId : userId}`;
      
      // Emit web and mobile events
      io.to(userId.toString()).to(otherUserId.toString()).emit("receive_message", completeMsg);
      io.to(userId.toString()).to(otherUserId.toString()).emit("receive-message", completeMsg);

      io.to(otherUserId.toString()).emit("unread_update", {
        bookingId: virtualRoomId,
        unreadCount: 1,
        sender_id: userId // web compat
      });

      // Create system notification for push
      await db.Notification.create({
        user_id: otherUserId,
        title: "New Message",
        message: `${req.user.name || "System Admin"} sent you a message`,
        type: "CHAT",
        data: { bookingId: virtualRoomId } // Deep linking param saved in data JSON
      });

      return res.status(201).json(SuccessResponse("Message sent", completeMsg));
    }

    // Standard Customer-Artist chat flow
    if (!bookingId && receiver_id) {
      // Find latest confirmed booking between userId and receiver_id
      const artist = await db.ArtistProfile.findOne({
        where: {
          user_id: { [Op.in]: [userId, receiver_id] }
        }
      });
      if (artist) {
        const actualCustomerId = artist.user_id === userId ? receiver_id : userId;
        const fallbackBooking = await db.Booking.findOne({
          where: {
            user_id: actualCustomerId,
            artist_id: artist.id,
            booking_status: { [Op.in]: ["CONFIRMED", "COMPLETED"] }
          },
          order: [["updatedAt", "DESC"]]
        });
        if (fallbackBooking) {
          bookingId = fallbackBooking.id;
        }
      }
    }

    if (!bookingId || (!message && !media)) {
      return res.status(400).json(ErrorResponse("Booking ID (or legacy Receiver ID) and message content are required"));
    }

    const auth = await getChatAuthContext(userId, bookingId);
    if (!auth) {
      return res.status(403).json(ErrorResponse("Chat is closed or booking is unauthorized"));
    }

    if (!auth.active) {
      return res.status(400).json(ErrorResponse("This chat session is closed. Chats close 7 days after service completion."));
    }

    const blocked = await isBlocked(userId, auth.otherUserId);
    if (blocked) {
      return res.status(403).json(ErrorResponse("Message blocked. Communication restricted between these accounts."));
    }

    const newMsg = await db.Message.create({
      sender_id: userId,
      receiver_id: auth.otherUserId,
      booking_id: bookingId,
      message: message || "",
      message_type: finalMessageType,
      parent_message_id: finalParentMessageId,
      is_read: false
    });

    let savedMedia = null;
    if (media) {
      savedMedia = await db.MessageMedia.create({
        message_id: newMsg.id,
        file_url: media.file_url,
        file_type: media.file_type,
        file_size: media.file_size,
        duration: media.duration,
        waveform: media.waveform ? JSON.stringify(media.waveform) : null
      });
    }

    const completeMsg = await db.Message.findByPk(newMsg.id, {
      include: [
        { model: db.MessageMedia, as: "media" },
        { model: db.Message, as: "parentMessage", include: [{ model: db.MessageMedia, as: "media" }] }
      ]
    });

    // Emit via sockets
    const io = getIO();
    io.to(`booking_room_${bookingId}`).emit("receive-message", completeMsg);
    io.to(`booking_room_${bookingId}`).emit("receive_message", completeMsg); // Web compat

    // Dynamic unread count updates
    io.to(auth.otherUserId.toString()).emit("unread_update", {
      bookingId,
      unreadCount: 1,
      sender_id: userId // web compat
    });

    // Create system notification for push
    await db.Notification.create({
      user_id: auth.otherUserId,
      title: "New Message",
      message: `${req.user.name || "MehndiGo User"} sent you a message`,
      type: "CHAT",
<<<<<<< HEAD
      booking_id: bookingId,
      data: JSON.stringify({ bookingId: bookingId, booking_id: bookingId, senderId: req.user.id })
=======
      data: { bookingId: bookingId.toString() } // Deep linking param saved in data JSON
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a
    });

    return res.status(201).json(SuccessResponse("Message sent", completeMsg));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 4. PUT /chat/read
async function markChatAsRead(req, res) {
  try {
    const userId = req.user.id;
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json(ErrorResponse("Booking ID is required"));
    }

    await db.Message.update(
      { is_read: true },
      {
        where: {
          booking_id: bookingId,
          receiver_id: userId,
          is_read: false
        }
      }
    );

    const io = getIO();
    io.to(`booking_room_${bookingId}`).emit("messages_read", {
      bookingId,
      readerId: userId
    });

    return res.status(200).json(SuccessResponse("Messages marked as read"));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 5. DELETE /chat/message/:id
async function deleteMessage(req, res) {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;
    const { delete_type } = req.body; // 'me' or 'everyone'

    const message = await db.Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json(ErrorResponse("Message not found"));
    }

    const auth = await getChatAuthContext(userId, message.booking_id);
    if (!auth || !auth.active) {
      return res.status(400).json(ErrorResponse("This chat session is closed. Message deletion is disabled."));
    }

    if (delete_type === "everyone") {
      if (message.sender_id !== userId) {
        return res.status(403).json(ErrorResponse("You can only delete your own messages for everyone"));
      }

      // Check editing/deletion limit (within 15 minutes)
      const messageTime = new Date(message.createdAt).getTime();
      const fifteenMinMs = 15 * 60 * 1000;
      if (Date.now() - messageTime > fifteenMinMs) {
        return res.status(400).json(ErrorResponse("Messages can only be deleted for everyone within 15 minutes."));
      }

      // Delete everyone
      await message.update({
        is_deleted_everyone: true,
        message: "This message was deleted"
      });

      // Clear media if any
      await db.MessageMedia.destroy({ where: { message_id: messageId } });

      const io = getIO();
      io.to(`booking_room_${message.booking_id}`).emit("message_deleted_everyone", {
        messageId,
        bookingId: message.booking_id
      });
    } else {
      // Delete for me
      if (message.sender_id === userId) {
        await message.update({ deleted_by_sender: true });
      } else {
        await message.update({ deleted_by_receiver: true });
      }
    }

    return res.status(200).json(SuccessResponse("Message deleted successfully"));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 6. POST /chat/upload
async function uploadMedia(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json(ErrorResponse("No file uploaded"));
    }

    const { size, mimetype } = req.file;
    const isDoc = mimetype === "application/pdf" || 
                  mimetype.startsWith("application/vnd.") || 
                  mimetype.startsWith("application/msword") ||
                  mimetype.startsWith("text/") || 
                  mimetype.includes("zip");

    if (mimetype.startsWith("image/") && size > 5 * 1024 * 1024) {
      return res.status(400).json(ErrorResponse("Image exceeds 5MB size limit"));
    }
    if (mimetype.startsWith("video/") && size > 20 * 1024 * 1024) {
      return res.status(400).json(ErrorResponse("Video exceeds 20MB size limit"));
    }
    if (isDoc && size > 10 * 1024 * 1024) {
      return res.status(400).json(ErrorResponse("Document exceeds 10MB size limit"));
    }

    let fileType = "image";
    if (mimetype.startsWith("video/")) fileType = "video";
    else if (isDoc) fileType = "pdf";
    else if (mimetype.startsWith("audio/") || mimetype.startsWith("application/octet-stream")) fileType = "voice";

    return res.status(201).json(SuccessResponse("Media uploaded successfully", {
      file_url: req.file.path, // Cloudinary URL
      file_type: fileType,
      file_size: size
    }));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 7. GET /chat/media
async function getMediaHistory(req, res) {
  try {
    const userId = req.user.id;
    const { bookingId } = req.query;

    if (!bookingId) {
      return res.status(400).json(ErrorResponse("Booking ID is required"));
    }

    const auth = await getChatAuthContext(userId, bookingId);
    if (!auth) {
      return res.status(403).json(ErrorResponse("Unauthorized to access booking chat"));
    }

    const mediaMessages = await db.Message.findAll({
      where: {
        booking_id: bookingId,
        message_type: { [Op.in]: ["IMAGE", "VIDEO", "PDF", "VOICE"] },
        [Op.or]: [
          { sender_id: userId, deleted_by_sender: false },
          { receiver_id: userId, deleted_by_receiver: false }
        ]
      },
      include: [{ model: db.MessageMedia, as: "media" }],
      order: [["createdAt", "DESC"]]
    });

    const mediaList = mediaMessages.map(m => m.media).filter(Boolean);
    return res.status(200).json(SuccessResponse("Media history fetched", mediaList));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 8. POST /chat/report
async function reportUser(req, res) {
  try {
    const userId = req.user.id;
    const { bookingId, reportedId, reason } = req.body;

    if (!bookingId || !reportedId || !reason) {
      return res.status(400).json(ErrorResponse("Booking ID, Reported User ID and reason are required"));
    }

    const report = await db.ReportedChat.create({
      reporter_id: userId,
      reported_id: reportedId,
      booking_id: bookingId,
      reason,
      status: "PENDING"
    });

    return res.status(201).json(SuccessResponse("Chat reported successfully", report));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 9. POST /chat/block
async function blockUser(req, res) {
  try {
    const userId = req.user.id;
    const { blockedId } = req.body;

    if (!blockedId) {
      return res.status(400).json(ErrorResponse("Blocked User ID is required"));
    }

    const existingBlock = await db.BlockedUser.findOne({
      where: { blocker_id: userId, blocked_id: blockedId }
    });

    if (existingBlock) {
      // Unblock
      await existingBlock.destroy();
      return res.status(200).json(SuccessResponse("User unblocked successfully"));
    } else {
      // Block
      const block = await db.BlockedUser.create({
        blocker_id: userId,
        blocked_id: blockedId
      });
      return res.status(201).json(SuccessResponse("User blocked successfully", block));
    }
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 10. PUT /chat/room/pin-archive
async function pinOrArchiveRoom(req, res) {
  try {
    const userId = req.user.id;
    const { bookingId, action, value } = req.body; // action: 'pin' | 'archive'

    if (!bookingId || !action) {
      return res.status(400).json(ErrorResponse("Booking ID and action are required"));
    }

    const auth = await getChatAuthContext(userId, bookingId);
    if (!auth) {
      return res.status(403).json(ErrorResponse("Unauthorized to access room settings"));
    }

    const [room] = await db.ChatRoom.findOrCreate({
      where: { booking_id: bookingId },
      defaults: { booking_id: bookingId }
    });

    const isCustomer = auth.isCustomer;
    const updateData = {};

    if (action === "pin") {
      if (isCustomer) updateData.is_pinned_customer = !!value;
      else updateData.is_pinned_artist = !!value;
    } else if (action === "archive") {
      if (isCustomer) updateData.is_archived_customer = !!value;
      else updateData.is_archived_artist = !!value;
    }

    await room.update(updateData);
    return res.status(200).json(SuccessResponse("Room preference updated successfully", room));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 11. PUT /chat/message/edit
async function editMessage(req, res) {
  try {
    const userId = req.user.id;
    const { messageId, message } = req.body;

    if (!messageId || !message) {
      return res.status(400).json(ErrorResponse("Message ID and content are required"));
    }

    const msg = await db.Message.findByPk(messageId);
    if (!msg) {
      return res.status(404).json(ErrorResponse("Message not found"));
    }

    const auth = await getChatAuthContext(userId, msg.booking_id);
    if (!auth || !auth.active) {
      return res.status(400).json(ErrorResponse("This chat session is closed. Message editing is disabled."));
    }

    if (msg.sender_id !== userId) {
      return res.status(403).json(ErrorResponse("You can only edit your own messages"));
    }

    const messageTime = new Date(msg.createdAt).getTime();
    const fifteenMinMs = 15 * 60 * 1000;
    if (Date.now() - messageTime > fifteenMinMs) {
      return res.status(400).json(ErrorResponse("Messages can only be edited within 15 minutes."));
    }

    await msg.update({
      message,
      is_edited: true
    });

    const completeMsg = await db.Message.findByPk(messageId, {
      include: [
        { model: db.MessageMedia, as: "media" },
        { model: db.Message, as: "parentMessage", include: [{ model: db.MessageMedia, as: "media" }] }
      ]
    });

    const io = getIO();
    io.to(`booking_room_${msg.booking_id}`).emit("message_edited", completeMsg);

    return res.status(200).json(SuccessResponse("Message edited successfully", completeMsg));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 12. Legacy getUnreadCounts
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
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 13. Legacy markChatAsSeen
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
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  getChatList,
  getChatHistory,
  sendMessage,
  markChatAsRead,
  deleteMessage,
  uploadMedia,
  getMediaHistory,
  reportUser,
  blockUser,
  pinOrArchiveRoom,
  editMessage,
  getUnreadCounts,
  markChatAsSeen
};
