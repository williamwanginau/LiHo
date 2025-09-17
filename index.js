const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "http://localhost:5173";
const cors = require("cors");
const crypto = require("crypto");

const corsOptions = {
  origin: ALLOWED_ORIGINS,
  credentials: true,
};

app.use(cors(corsOptions));

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/", (req, res) => {
  res.send("Hello World");
});

// CORS for Socket.io
const io = new Server(server, {
  cors: corsOptions,
});

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("socket disconnected:", socket.id);
  });

  const reply = (ack, evt, payload, ok = true) => {
    const res = { ok, event: evt, data: payload };
    if (typeof ack === "function") ack(res);
    else socket.emit(evt, res);
  };

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
      return reply(ack, "leave:room", { error: "Room ID is required" }, false);

    socket.leave(rid);
    socket.data.roomId = null;

    reply(ack, "leave:room", { roomId: rid });
  });

  socket.on("user:identify", (user, ack) => {
    socket.data.userId = user.id;
    ack({
      id: user.id,
      ok: true,
      user: user,
    });
  });

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
      return reply(ack, "message:send:ack", { error: "Room not found" }, false);
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

    if (typeof text !== "string" || !text.trim() || text.length > 1000) {
      return reply(
        ack,
        "message:send:ack",
        { error: "VALIDATION_ERROR" },
        false
      );
    }

    const msg = {
      id: crypto.randomUUID(),
      roomId: rid,
      senderId: userId,
      clientTempId,
      text: body,
      createdAt: new Date().toISOString(),
      serverTimeMs: Date.now(),
    };

    reply(ack, "message:send:ack", { message: msg }, true);
    socket.to(rid).emit("message:new", msg);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log("Allowed origins:", ALLOWED_ORIGINS);
});
