const { Server } = require("socket.io");

let io;

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

      // join room

      socket.on(
        "join",

        (userId) => {
          socket.join(userId);

          console.log(`User ${userId} joined`);
        },
      );

      // send message

      socket.on(
        "send_message",

        (data) => {
          console.log(data);

          io.to(data.receiver_id).emit(
            "receive_message",

            data,
          );
        },
      );

      // disconnect

      socket.on(
        "disconnect",

        () => {
          console.log(
            "User disconnected:",

            socket.id,
          );
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
