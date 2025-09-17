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

  socket.on("user:identify", (user, ack) => {
    socket.data.userId = user.id;
    ack({
      id: user.id,
      ok: true,
      user: user,
    });
  });

  socket.on("join:room", (roomId, ack) => {
    socket.data.roomId = roomId;
    ack({
      ok: true,
      roomId: roomId,
    });
  });

  socket.on("leave:room", (roomId, ack) => {
    socket.data.roomId = null;
    ack({
      ok: true,
      roomId: roomId,
    });
  });

  socket.on("message:send", (message, ack) => {
    const senderId = socket.data.userId;
    if (!senderId) {
      ack({
        ok: false,
        error: "User not identified",
      });
      return;
    }

    ack({
      ok: true,
      message: {
        id: crypto.randomUUID(),
        roomId: message.roomId,
        senderId: senderId,
        clientTempId: message.clientTempId,
        text: message.text,
        createdAt: new Date(),
      },
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log("Allowed origins:", ALLOWED_ORIGINS);
});
