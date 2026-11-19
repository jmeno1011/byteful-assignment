import styles from "./footer.module.css";
// done
export default function Footer() {
  return (
    <footer className={styles["page-footer"]}>
      <span>
        Brand assets:{" "}
        <a
          href="https://byteful.com/brand-assets"
          target="_blank"
          rel="noreferrer"
        >
          <strong>Byteful</strong>
        </a>
      </span>
      <span>
        Completed: <time dateTime="2026-11-18">2026.11.18</time>
      </span>
    </footer>
  );
}
