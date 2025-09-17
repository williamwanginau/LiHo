import { useEffect, useState, useMemo, useCallback } from "react";
import "./App.css";
import { io } from "socket.io-client";
import users from "./users";
import rooms from "./rooms";

// Socket.IO client
const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:3000";
const socket = io(WS_URL, { transports: ["websocket"], autoConnect: false });

export default function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
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

  const joinRoom = useCallback(() => {
    socket.emit("join:room", { roomId }, (res) => {
      if (res?.ok) {
        console.log("join room success");
      } else {
        console.error("join room failed", res?.error);
      }
    });
  }, [roomId]);

  // Minimal event console states
  const [text, setText] = useState("");
  const [logs, setLogs] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [messages, setMessages] = useState([]);
  const pushLog = useCallback((event, data) => {
    setLogs((prev) => [...prev, { ts: Date.now(), event, data }]);
  }, []);

  const me = useMemo(() => {
    return (
      users.find((u) => String(u.external_id) === String(userExternalId)) ||
      users[0]
    );
  }, [userExternalId]);

  const sendMessage = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || !socket.connected) return;
    const tempId = crypto?.randomUUID?.() || String(Date.now());
    const payload = {
      clientTempId: tempId,
      text: trimmed,
      roomId,
    };

    pushLog("emit:message:send", [payload]);
    try {
      socket.emit("message:send", payload, (ack) => {
        pushLog("message:send:ack", [ack]);
        try {
          const ackMsg = ack?.message ?? ack?.data?.message;
          if (ack?.ok && ackMsg) {
            const norm = normalizeMessage(ackMsg, roomId);
            setMessages((prev) => [...prev, norm]);
          }
        } catch {
          /* empty */
        }
      });
    } catch (err) {
      pushLog("ack:error", [String(err)]);
    }
    setText("");
  }, [me?.external_id, roomId, pushLog, text]);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onConnect = () => {
      setIsConnected(true);
      socket.emit(
        "user:identify",
        { id: me?.id, externalId: userExternalId, nickname: me?.name },
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
    const onDisconnect = () => {
      setStatus("disconnected");
      setIsConnected(false);
    };
    const onError = (err) => {
      console.error("connect_error", err);
      setStatus("connect_error");
      setIsConnected(false);
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

  // Join selected room when connected or when room changes
  useEffect(() => {
    if (!isConnected || !roomId) return;
    joinRoom();
  }, [roomId, isConnected, joinRoom]);

  // Normalize various server message shapes to a single shape
  const normalizeMessage = useCallback(
    (m) => {
      const id = m.id || m.message_id || m.uuid || undefined;
      const text = m.text ?? "";
      const senderId = m.sender_id ?? m.senderId ?? m.user_id ?? m.userId ?? "";
      const room = m.room_id ?? m.roomId ?? roomId;
      const createdAt =
        m.created_at ??
        m.createdAt ??
        m.serverTime ??
        m.server_time ??
        Date.now();
      const serverTimeMs =
        typeof createdAt === "number" ? createdAt : Date.parse(createdAt);
      return {
        id,
        text,
        senderId,
        room_id: String(room || ""),
        created_at: createdAt,
        serverTimeMs,
      };
    },
    [roomId]
  );

  // Load history when switching rooms
  useEffect(() => {
    if (!roomId) return;
    setMessages([]);
    const controller = new AbortController();
    const load = async () => {
      try {
        const base = WS_URL.replace(/\/$/, "");
        const url = `${base}/messages?roomId=${encodeURIComponent(roomId)}&limit=50`;
        const res = await fetch(url, { signal: controller.signal, credentials: "include" });
        if (!res.ok) {
          pushLog("history:error", [res.status, res.statusText]);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.messages)
          ? data.messages
          : Array.isArray(data?.data)
          ? data.data
          : [];
        const normalized = list.map((m) => normalizeMessage(m, roomId));
        setMessages(normalized);
        pushLog("history:loaded", [{ count: normalized.length }]);
      } catch (err) {
        if (err?.name !== "AbortError") {
          pushLog("history:error", [String(err)]);
        }
      }
    };
    load();
    return () => controller.abort();
  }, [roomId, normalizeMessage, pushLog]);

  // (duplicate join + normalize removed after refactor)

  // Listen for message:new to update chat transcript
  useEffect(() => {
    const onNew = (msg) => {
      pushLog("message:new", [msg]);
      try {
        const norm = normalizeMessage(msg);
        if (!norm.room_id || String(norm.room_id) === String(roomId)) {
          setMessages((prev) => [...prev, norm]);
        }
      } catch {
        /* empty */
      }
    };
    socket.on("message:new", onNew);
    return () => socket.off("message:new", onNew);
  }, [pushLog, normalizeMessage, roomId]);

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

  const roomIdShort = useMemo(() => {
    try {
      return String(roomId || "").slice(0, 8);
    } catch {
      return String(roomId || "");
    }
  }, [roomId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        padding: 20,
        fontFamily: "ui-sans-serif, system-ui, -apple-system",
        background: "#f8fafc",
        display: "flex",
        flexDirection: "column",
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
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
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
          </div>
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
                sendMessage();
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
            onClick={() => sendMessage()}
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

        {/* Chat transcript (replaces event console area) */}
        <div
          style={{
            marginTop: 12,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            borderRadius: 10,
            padding: 8,
            paddingTop: 28,
            height: 240,
            overflow: "auto",
            textAlign: "left",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 6,
              right: 8,
              padding: "2px 8px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "#eef2ff",
              color: "#111827",
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
            title={`Room: ${roomId}`}
          >
            🧩 {roomIdShort}
          </span>
          {messages.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 13 }}>
              No messages yet. Try sending one.
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={`${m.id || m.serverTimeMs || i}-${i}`}
                style={{ marginBottom: 8 }}
              >
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {new Date(m.serverTimeMs || Date.now()).toLocaleTimeString()} {" "}
                  {(() => {
                    const isSelf =
                      String(m?.senderId ?? "") === String(me?.external_id ?? "") ||
                      String(m?.senderId ?? "") === String(me?.id ?? "");
                    const sender = users.find(
                      (u) =>
                        String(u.external_id) === String(m?.senderId ?? "") ||
                        String(u.id) === String(m?.senderId ?? "")
                    );
                    const nickname = isSelf ? me?.name : sender?.name;
                    const idLabel = isSelf
                      ? String(me?.external_id ?? me?.id ?? "")
                      : String(sender?.external_id ?? sender?.id ?? m?.senderId ?? "");
                    return `${nickname || "Unknown"}(${idLabel})`;
                  })()}
                </div>
                <div
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Moved event console below card with a toggle */}
      <div style={{ width: "min(92vw, 480px)", marginTop: 12 }}>
        <button
          onClick={() => setShowLog((v) => !v)}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
          }}
        >
          {showLog ? "🙈 Hide Logs" : "🛠 Show Logs"}
        </button>
        {showLog && (
          <div
            style={{
              marginTop: 8,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#111827",
              borderRadius: 10,
              padding: 8,
              maxHeight: 260,
              overflow: "auto",
              textAlign: "left",
            }}
          >
            {logs.length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                No events yet.
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
                      color: "#111827",
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
        )}
      </div>
    </div>
  );
}
