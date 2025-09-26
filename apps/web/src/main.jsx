import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Chats from "./Chats.jsx";
import SidebarAdd from "./components/sidebar/SidebarAdd.jsx";
import SidebarChats from "./components/sidebar/SidebarChats.jsx";
import SidebarContacts from "./components/sidebar/SidebarContacts.jsx";
import ChatsGate from "./ChatsGate.jsx";

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  {
    path: "/chats",
    element: (
      <ChatsGate>
        <Chats />
      </ChatsGate>
    ),
    children: [
      { path: "/chats/add", element: <SidebarAdd /> },
      { path: "/chats/chats", element: <SidebarChats /> },
      { path: "/chats/contacts", element: <SidebarContacts /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
