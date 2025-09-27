const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "http://localhost:5173";
const cors = require("cors");
const { createUsersRepo } = require("./repos/usersRepo");
const { createRoomsRepo } = require("./repos/roomsRepo");
const { createFriendsRepo } = require("./repos/friendsRepo");
const { initSocket } = require("./socket");
const MAX_PER_ROOM = Number(process.env.MAX_PER_ROOM) || 1000;
const messagesByRoom = new Map();
const dedupe = new Map();

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

// Simple users endpoint to simulate DB fetch
app.get("/users", (req, res) => {
  const users = createUsersRepo({ seed: true }).getUsers();
  res.json({ ok: true, items: users });
});

app.get("/me", (req, res) => {
  const { externalId } = req.query;
  const user = createUsersRepo({ seed: true }).getUserByExternalId(externalId);
  res.json({ ok: true, item: user });
});
app.get("/rooms", (req, res) => {
  const rooms = createRoomsRepo({ seed: true }).getRooms();
  res.json({ ok: true, items: rooms });
});

app.get("/friends", (req, res) => {
  const { externalId } = req.query;
  const friends = createFriendsRepo({ seed: true }).listFriendsByExternalId(
    externalId
  );
  res.json({ ok: true, items: friends });
});

initSocket(server, {
  corsOptions,
  messagesByRoom,
  dedupe,
  maxPerRoom: MAX_PER_ROOM,
});

app.get("/messages", (req, res) => {
  const { roomId } = req.query;
  const messages = messagesByRoom.get(roomId) || [];
  res.json({ ok: true, items: messages });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log("Allowed origins:", ALLOWED_ORIGINS);
});
