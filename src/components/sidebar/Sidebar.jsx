import styles from "./Sidebar.module.css";

const Sidebar = ({ onResizeStart }) => {
  return (
    <aside className={styles.sidebar}>
      Sidebar
      <div className={styles.resizer} onMouseDown={onResizeStart} />
    </aside>
  );
};

export default Sidebar;
