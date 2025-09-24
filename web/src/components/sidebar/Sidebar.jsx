import styles from "./Sidebar.module.css";
import { Outlet } from "react-router-dom";

const Sidebar = ({ onResizeStart }) => {
  return (
    <aside className={styles.sidebar}>
      <Outlet />
      <div className={styles.resizer} onMouseDown={onResizeStart} />
    </aside>
  );
};

export default Sidebar;
