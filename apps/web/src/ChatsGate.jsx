import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "./lib/api";

const STORAGE_KEY = "chatUserExternalId";

export default function ChatsGate({ children }) {
  const navigate = useNavigate();
  useEffect(() => {
    async function loadMe() {
      const externalId = localStorage.getItem(STORAGE_KEY);
      if (!externalId) {
        navigate("/");
        return;
      }

      try {
        const { data } = await api.get("/me", {
          params: { externalId },
          withCredentials: true,
        });
        if (data.ok) {
          navigate("/chats");
        } else {
          navigate("/");
        }
      } catch (err) {
        console.error(getErrorMessage(err));
      }
    }
    loadMe();
  }, [navigate]);
  return children;
}
