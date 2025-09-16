import { useEffect, useState, useMemo } from "react";
import "./App.css";
import { io } from "socket.io-client";
import users from "./users";

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:3000";

const socket = io(WS_URL, { transports: ["websocket"], autoConnect: false });

export default function App() {
  const [status, setStatus] = useState("connecting");
  const STORAGE_KEY = "chatUserExternalId";
  const initialExternalId = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const found = users.find(
          (u) => String(u.external_id) === String(saved)
        );
        if (found) return String(found.external_id);
      }
    } catch {
      /* empty */
    }
    return String(users[0]?.external_id || "");
  }, []);
  const [userExternalId, setUserExternalId] = useState(initialExternalId);

  const me = useMemo(() => {
    return (
      users.find((u) => String(u.external_id) === String(userExternalId)) ||
      users[0]
    );
  }, [userExternalId]);

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
    };
  }, []);

  useEffect(() => {
    try {
      if (userExternalId) {
        localStorage.setItem(STORAGE_KEY, String(userExternalId));
      }
    } catch {
      /* empty */
    }
  }, [userExternalId]);

  const prettyStatus = useMemo(() => {
    if (status.startsWith("connected")) return `🟢 ${status}`;
    if (status === "connect_error") return "🟠 connect_error";
    if (status === "connecting") return "⏳ connecting...";
    return "🔴 disconnected";
  }, [status]);

  const statusColors = useMemo(() => {
    if (status.startsWith("connected"))
      return { bg: "#dcfce7", fg: "#065f46", br: "#86efac" };
    if (status === "connect_error")
      return { bg: "#fef9c3", fg: "#92400e", br: "#fde68a" };
    if (status === "connecting")
      return { bg: "#e5e7eb", fg: "#374151", br: "#d1d5db" };
    return { bg: "#fee2e2", fg: "#991b1b", br: "#fecaca" };
  }, [status]);

  return (
    <div
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        padding: 20,
        fontFamily: "ui-sans-serif, system-ui, -apple-system",
        background: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "min(92vw, 480px)",
          margin: "0 auto",
          background: "#ffffff",
          color: "#111827",
          textAlign: "left",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          padding: 16,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20 }}>💬 Chat Sandbox</h1>
          <span
            style={{
              marginLeft: "auto",
              padding: "4px 10px",
              borderRadius: 999,
              border: `1px solid ${statusColors.br}`,
              background: statusColors.bg,
              color: statusColors.fg,
              fontSize: 13,
            }}
            title={status}
          >
            {prettyStatus}
          </span>
        </header>

        <p
          style={{
            marginTop: 0,
            marginBottom: 12,
            color: "#374151",
            display: "flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
            overflowX: "auto",
          }}
        >
          🔌 Backend URL:{" "}
          {
            <code
              style={{
                color: "#111827",
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                padding: "2px 6px",
              }}
            >
              {WS_URL}
            </code>
          }
        </p>

        <div
          style={{
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
            overflowX: "auto",
          }}
        >
          <label htmlFor="userSelect" style={{ fontWeight: 600 }}>
            👤 Select user
          </label>
          <select
            id="userSelect"
            value={userExternalId}
            onChange={(e) => setUserExternalId(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
            }}
          >
            {users.map((u) => (
              <option key={u.external_id} value={u.external_id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
            overflowX: "auto",
          }}
        >
          <div style={{ color: "#4b5563" }}>🪪 User ID:</div>
          <code
            style={{
              color: "#111827",
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              padding: "2px 6px",
            }}
          >
            #{me?.id}
          </code>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
            overflowX: "auto",
          }}
        >
          <div style={{ color: "#4b5563" }}>🔑 Client ID:</div>
          <code
            style={{
              color: "#111827",
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              padding: "2px 6px",
            }}
          >
            {me?.external_id}
          </code>
        </div>
      </div>
    </div>
  );
}
