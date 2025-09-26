const { Server } = require("socket.io");
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "http://localhost:5173";
const corsOptions = {
  origin: ALLOWED_ORIGINS,
  credentials: true,
};

function initSocket(server) {
  const io = new Server(server, {
    cors: corsOptions,
    transports: ["websocket"],
  });

  const reply = (socket, ack, evt, payload, ok = true) => {
    const res = { ok, event: evt, data: payload };
    if (typeof ack === "function") ack(res);
    else socket.emit(evt, res);
  };

  const saveMessage = ({ rid, userId, clientTempId, body }) => {
    const dedupeKey = `${userId}:${clientTempId}`;

    // Check if message is already saved
    if (dedupe.has(dedupeKey)) {
      const existingMsg = dedupe.get(dedupeKey);
      return { msg: existingMsg, duplicate: true };
    }

    // Create new message
    const msg = {
      id: crypto.randomUUID(),
      roomId: rid,
      senderId: userId,
      clientTempId,
      text: body,
      createdAt: new Date().toISOString(),
      serverTimeMs: Date.now(),
    };

    // Save message
    if (!messagesByRoom.has(rid)) {
      messagesByRoom.set(rid, []);
    }
    const list = messagesByRoom.get(rid);
    if (list.length >= MAX_PER_ROOM) {
      list.shift();
    }

    list.push(msg);

    dedupe.set(dedupeKey, msg);

    return { msg, duplicate: false };
  };

  io.on("connection", (socket) => {
    console.log("socket connected:", socket.id);
    socket.on("disconnect", () => {
      console.log("socket disconnected:", socket.id);
    });

    // JOIN ROOM
    socket.on("join:room", ({ roomId } = {}, ack) => {
      if (!roomId) {
        return reply(ack, "join:room", { error: "Room ID is required" }, false);
      }

      if (socket.data.roomId) socket.leave(socket.data.roomId);

      socket.data.roomId = roomId;
      socket.join(roomId);

      reply(ack, "join:room", { roomId: roomId });
    });

    // LEAVE ROOM
    socket.on("leave:room", (roomId, ack) => {
      const rid = roomId || socket.data.roomId;
      if (!rid)
        return reply(
          ack,
          "leave:room",
          { error: "Room ID is required" },
          false
        );

      socket.leave(rid);
      socket.data.roomId = null;

      reply(ack, "leave:room", { roomId: rid });
    });

    // USER IDENTIFY
    socket.on("user:identify", (user, ack) => {
      socket.data.userId = user.id;
      ack({
        id: user.id,
        ok: true,
        user: user,
      });
    });

    // MESSAGE SEND
    socket.on("message:send", (message, ack) => {
      const { roomId, clientTempId, text } = message;
      const rid = roomId || socket.data.roomId;

      if (!rid)
        return reply(
          ack,
          "message:send:ack",
          { error: "Room ID is required" },
          false
        );

      const userId = socket.data.userId;

      if (!userId) {
        return reply(
          ack,
          "message:send:ack",
          { error: "User not identified" },
          false
        );
      }

      if (!socket.rooms.has(rid)) {
        return reply(
          ack,
          "message:send:ack",
          { error: "Room not found" },
          false
        );
      }

      if (!clientTempId) {
        return reply(
          ack,
          "message:send:ack",
          { error: "clientTempId is required" },
          false
        );
      }

      const body = typeof text === "string" ? text.trim() : "";

      if (!body || body.length > 1000) {
        return reply(
          ack,
          "message:send:ack",
          { error: "VALIDATION_ERROR" },
          false
        );
      }

      const { msg, duplicate } = saveMessage({
        rid,
        userId,
        clientTempId,
        body,
      });

      reply(ack, "message:send:ack", { message: msg, duplicate }, true);

      if (duplicate) return;

      socket.to(rid).emit("message:new", msg);
    });
  });

  return io;
}

module.exports = {
  initSocket,
};
