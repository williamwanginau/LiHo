import { api, getErrorMessage } from "../../lib/api";
import Avatar from "../../lib/avatar.jsx";
import { useState, useEffect } from "react";

const STORAGE_KEY = "chatUserExternalId";

export default function SidebarContacts() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const externalId = localStorage.getItem(STORAGE_KEY);
    if (!externalId) return;
    api
      .get("/friends", { params: { externalId } })
      .then((res) => setUsers(res.data?.ok ? res.data.items || [] : []))
      .catch((err) => {
        console.error(getErrorMessage(err));
        setUsers([]);
      });
  }, []);

  return (
    <div style={{ padding: 12 }}>
      {users.map((u) => (
        <div
          key={u.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 0",
          }}
        >
          <Avatar user={u} size={32} style="adventurer" />
          <div>{u.nickname || u.username || "Anonymous"}</div>
        </div>
      ))}
    </div>
  );
}
