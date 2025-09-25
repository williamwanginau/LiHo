import { useState, useEffect } from "react";
const STORAGE_KEY = "chatUserExternalId";
import { api, getErrorMessage } from "./lib/api";
import { useNavigate } from "react-router-dom";
export default function App() {
  const [apiUser, setApiUser] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;

    async function fetchUsers() {
      try {
        const res = await api.get("/users", {
          signal: ctrl.signal,
        });
        const items = res.data.items;
        if (cancelled) return;
        setApiUser(items);
        setSelectedUser(items[0].externalId);
      } catch (err) {
        console.error(getErrorMessage(err));
      }
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!selectedUser && apiUser.length > 0) {
      setSelectedUser(apiUser[0].externalId);
    }
  }, [apiUser, selectedUser]);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    localStorage.setItem(STORAGE_KEY, selectedUser);
    navigate("/chats");
  };

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <h1 style={{ marginBottom: 12 }}>Select a user</h1>
      <form onSubmit={onSubmit}>
        <label>
          User:
          <select
            style={{ marginLeft: 8 }}
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            {apiUser.map((u) => (
              <option key={u.id} value={u.externalId}>
                {u.nickname || "Anonymous"} ({u.externalId})
              </option>
            ))}
          </select>
        </label>
        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={!selectedUser}>
            Start Chat
          </button>
        </div>
      </form>
    </div>
  );
}
