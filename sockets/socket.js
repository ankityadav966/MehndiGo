const { Server } = require("socket.io");
const MessageRepository = require("../repositories/message.repository");
const db = require("../models");

const MessageRepositor = new MessageRepository();
let io;
const onlineUsers = new Map(); // userId -> socket.id

function initSocket(server) {
  io = new Server(
    server,

    {
      cors: {
        origin: "*",
      },
    },
  );

  io.on(
    "connection",

    (socket) => {
      console.log(
        "User connected:",

        socket.id,
      );

      let currentUserId = null;

      // join room
      socket.on(
        "join",

        (userId) => {
          if (!userId) return;
          currentUserId = userId.toString();
          socket.join(currentUserId);
          onlineUsers.set(currentUserId, socket.id);

          console.log(`User ${userId} joined room`);
          
          // Broadcast status online
          io.emit("user_status", { userId: currentUserId, status: "online" });
        },
      );

      // check status
      socket.on("get_user_status", (userId) => {
        if (!userId) return;
        const isOnline = onlineUsers.has(userId.toString());
        socket.emit("user_status", { userId: userId.toString(), status: isOnline ? "online" : "offline" });
      });

      // send message
      socket.on(
        "send_message",

        async (data) => {
          console.log("Socket message received:", data);
          try {
            const savedMsg = await MessageRepositor.create({
              sender_id: data.sender_id,
              receiver_id: data.receiver_id,
              message: data.message,
              is_read: false,
            });

            // Emit to receiver's room if connected
            io.to(data.receiver_id.toString()).emit(
              "receive_message",
              savedMsg
            );

            // Send confirmation back to sender
            socket.emit("message_saved", savedMsg);
            
            // Send unread notification to receiver (or dynamic count update)
            io.to(data.receiver_id.toString()).emit("unread_update", {
              sender_id: data.sender_id,
            });
          } catch (err) {
            console.error("Error saving socket message:", err);
          }
        },
      );

      // mark messages as read/seen
      socket.on("read_messages", async ({ sender_id, receiver_id }) => {
        try {
          if (!sender_id || !receiver_id) return;
          
          await db.Message.update(
            { is_read: true },
            {
              where: {
                sender_id,
                receiver_id,
                is_read: false,
              },
            }
          );

          // Emit to sender that receiver saw the messages
          io.to(sender_id.toString()).emit("messages_read", {
            sender_id,
            receiver_id,
          });
        } catch (err) {
          console.error("Error marking messages as read via socket:", err);
        }
      });

      // disconnect
      socket.on(
        "disconnect",

        () => {
          console.log(
            "User disconnected:",

            socket.id,
          );
          
          if (currentUserId) {
            onlineUsers.delete(currentUserId);
            // Broadcast status offline
            io.emit("user_status", { userId: currentUserId, status: "offline" });
          }
        },
      );
    },
  );
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
