import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:3000";
// 單例連線，避免重複建立；以 websocket 傳輸為主
const socket = io(WS_URL, { transports: ["websocket"], autoConnect: false });

export default function App() {
  const [status, setStatus] = useState("connecting");

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onConnect = () => setStatus(`connected (${socket.id})`);
    const onDisconnect = () => setStatus("disconnected");
    const onError = (err) => {
      console.error("connect_error", err);
      setStatus("connect_error");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onError);
      // 不主動關閉 socket，避免在 React 嚴格模式下來回重連
    };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>WebSocket status: {status}</h1>
      <p>Backend URL: {WS_URL}</p>
    </div>
  );
}

