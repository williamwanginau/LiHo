import styles from "./NavRail.module.css";
import ChatIcon from "../../assets/chat.svg?react";
import UserIcon from "../../assets/user.svg?react";
import AddUserIcon from "../../assets/addUser.svg?react";
import { NavLink } from "react-router-dom";

const NavRail = () => {
  return (
    <div className={styles.navRail}>
      <NavLink to="/chats/contacts">
        <UserIcon className={styles.navRailItem} />
      </NavLink>
      <NavLink to="/chats/chats">
        <ChatIcon className={styles.navRailItem} />
      </NavLink>
      <NavLink to="/chats/add">
        <AddUserIcon className={styles.navRailItem} />
      </NavLink>
    </div>
  );
};

export default NavRail;
