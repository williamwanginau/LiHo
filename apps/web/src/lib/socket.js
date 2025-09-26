import { io } from "socket.io-client";

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:3000";

export const socket = io(WS_URL, {
  transports: ["websocket"],
  autoConnect: false,
  withCredentials: true,
});
