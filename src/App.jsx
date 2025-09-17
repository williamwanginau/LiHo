import { useEffect, useState, useMemo, useCallback } from "react";
import "./App.css";
import { io } from "socket.io-client";
import users from "./users";
import rooms from "./rooms";

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:3000";

const socket = io(WS_URL, { transports: ["websocket"], autoConnect: false });

export default function App() {
  const [status, setStatus] = useState("connecting");
  const STORAGE_KEY = "chatUserExternalId";
  const ROOM_STORAGE_KEY = "chatRoomId";
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
  const initialRoomId = useMemo(() => {
    try {
      const saved = localStorage.getItem(ROOM_STORAGE_KEY);
      if (saved) {
        const found = rooms.find((r) => String(r.id) === String(saved));
        if (found) return String(found.id);
      }
    } catch {
      /* empty */
    }
    return String(rooms[0]?.id || "");
  }, []);
  const [roomId, setRoomId] = useState(initialRoomId);

  // Minimal event console states
  const [text, setText] = useState("");
  const [logs, setLogs] = useState([]);
  const pushLog = useCallback((event, data) => {
    setLogs((prev) => [...prev, { ts: Date.now(), event, data }]);
  }, []);

  const me = useMemo(() => {
    return (
      users.find((u) => String(u.external_id) === String(userExternalId)) ||
      users[0]
    );
  }, [userExternalId]);

  const sendMessage = useCallback(
    (body) => {
      const trimmed = (body ?? text).trim();
      if (!trimmed || !socket.connected) return;
      const tempId = crypto?.randomUUID?.() || String(Date.now());

      const payload = {
        text: trimmed,
        roomId: roomId,
        clientTempId: tempId,
      };

      pushLog("emit:message:send", [payload]);
      try {
        socket.emit("message:send", payload, (ack) => {
          pushLog("ack:message:send", [ack]);
        });
      } catch (err) {
        pushLog("ack:error", [String(err)]);
      }
      setText("");
    },
    [me?.external_id, roomId, pushLog, text]
  );

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onConnect = () => {
      socket.emit(
        "user:identify",
        {
          id: me?.id,
          externalId: userExternalId,
          nickname: me?.name,
        },
        (res) => {
          if (res?.ok) {
            console.log("identify success", res.user);
          } else {
            console.error("identify failed", res?.error);
          }
        }
      );

      setStatus(`connected (${socket.id})`);
    };
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

  // Log all incoming events (including custom ack events if server emits them)
  useEffect(() => {
    const onAny = (event, ...args) => pushLog(event, args);
    socket.onAny(onAny);
    return () => {
      socket.offAny(onAny);
    };
  }, [pushLog]);

  useEffect(() => {
    try {
      if (userExternalId) {
        localStorage.setItem(STORAGE_KEY, String(userExternalId));
      }
    } catch {
      /* empty */
    }
  }, [userExternalId]);

  useEffect(() => {
    try {
      if (roomId) {
        localStorage.setItem(ROOM_STORAGE_KEY, String(roomId));
      }
    } catch {
      /* empty */
    }
  }, [roomId]);

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

        {/* Send box */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            alignItems: "center",
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage(text);
              }
            }}
            placeholder="Type message and press Enter"
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
            }}
          />
          <button
            onClick={() => sendMessage(text)}
            disabled={!socket.connected || !text.trim()}
            style={{ padding: "10px 14px" }}
            title={!socket.connected ? "Socket disconnected" : "Send"}
          >
            🚀 Send
          </button>
          <button onClick={() => setLogs([])} style={{ padding: "10px 12px" }}>
            🧹 Clear
          </button>
        </div>

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
          <label htmlFor="roomSelect" style={{ fontWeight: 600 }}>
            🧩 Room ID
          </label>
          <select
            id="roomSelect"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
            }}
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}
              </option>
            ))}
          </select>
        </div>

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

        {/* Live event console */}
        <div
          style={{
            marginTop: 12,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            borderRadius: 10,
            padding: 8,
            height: 240,
            overflow: "auto",
            textAlign: "left",
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 13 }}>
              No events yet. Try sending a message.
            </div>
          ) : (
            logs.map((row, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {new Date(row.ts).toLocaleTimeString()} — {row.event}
                </div>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: 12,
                  }}
                >
                  {row.data
                    .map((d) => {
                      try {
                        return JSON.stringify(d, null, 2);
                      } catch {
                        return String(d);
                      }
                    })
                    .join("\n")}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
