import { api, getErrorMessage } from "../../../lib/api";
import { useState, useEffect } from "react";

const SidebarContacts = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api
      .get("/users")
      .then((res) => {
        setUsers(res.data.items);
      })
      .catch((err) => {
        console.error(getErrorMessage(err));
      });
  }, []);
  return (
    <div>
      {users.map((user) => (
        <div key={user.id}>{user.nickname}</div>
      ))}
    </div>
  );
};

export default SidebarContacts;
