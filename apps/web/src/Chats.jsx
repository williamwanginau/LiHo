import Chat from "./components/chat/Chat";
import NavRail from "./components/navRail/NavRail";
import Sidebar from "./components/sidebar/Sidebar";
import styles from "./Chats.module.css";
import { useState, useCallback, useEffect } from "react";
import { api } from "./lib/api";
import { useNavigate } from "react-router-dom";
import { socket } from "./lib/socket";

const Chats = () => {
  const [sidebarW, setSidebarW] = useState(300);
  const railW = 64;
  const MIN = 300;
  const MAX = 680;
  const STORAGE_KEY = "chatUserExternalId";
  const navigate = useNavigate();
  const [_me, setMe] = useState(null);
  const [_isConnected, setIsConnected] = useState(socket.connected);
  const [_sid, setSid] = useState(null);
  const [_rooms, setRooms] = useState([]);

  useEffect(() => {
    async function getMe() {
      const externalId = localStorage.getItem(STORAGE_KEY);
      if (!externalId) {
        navigate("/");
        return;
      }
      const res = await api.get("/me", {
        params: { externalId },
      });
      setMe(res.data.item);
    }
    getMe();
  }, [navigate]);

  useEffect(() => {
    async function getRooms() {
      const res = await api.get("/rooms");
      setRooms(res.data.items);
    }
    getRooms();
  });

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setSid(socket.id || "");
      console.log("connected, sid:", socket.id);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setSid(null);
      console.log("disconnected");
    };

    if (!socket.connected) {
      socket.connect();
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  const onResizeStart = useCallback(
    (e) => {
      const startX = e.clientX;
      const startW = sidebarW;

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const next = Math.max(MIN, Math.min(MAX, startW + dx));
        setSidebarW(next);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    },
    [sidebarW]
  );

  return (
    <div
      className={styles.chats}
      style={{ "--rail-w": `${railW}px`, "--sidebar-w": `${sidebarW}px` }}
    >
      <NavRail />
      <Sidebar onResizeStart={onResizeStart} />
      <Chat />
    </div>
  );
};

export default Chats;
