import styles from "./header.module.css";
// donde
export default function Header() {
  return (
    <header className={styles["site-header"]}>
      <div className={styles["header-inner"]}>
        <a
          className={styles["header-brand"]}
          href="/"
          aria-label="Byteful home"
        >
          <img src="/brand/byteful.svg" alt="Byteful" width="128" height="32" />
        </a>
      </div>
    </header>
  );
}
