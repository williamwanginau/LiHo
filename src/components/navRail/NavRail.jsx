import styles from "./NavRail.module.css";
import ChatIcon from "../../assets/chat.svg?react";
import UserIcon from "../../assets/user.svg?react";
import AddUserIcon from "../../assets/addUser.svg?react";

const NavRail = () => {
  return (
    <div className={styles.navRail}>
      <UserIcon className={styles.navRailItem} />
      <ChatIcon className={styles.navRailItem} />
      <AddUserIcon className={styles.navRailItem} />
    </div>
  );
};

export default NavRail;
