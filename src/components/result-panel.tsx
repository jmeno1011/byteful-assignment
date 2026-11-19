import styles from "./result-panel.module.css";
import { useEffect, useRef } from "react";
import {
  Activity,
  Check,
  CheckCheck,
  Copy,
  Download,
  FileText,
  Globe2,
  LockKeyhole,
  Sparkles,
  Terminal,
  Trash2,
} from "lucide-react";
import type { LookupOption } from "@/features/locations/types";
import type { GeneratedConfiguration } from "@/features/residential/types";

interface Props {
  lines: string[];
  isGenerating: boolean;
  notice: string;
  error: string;
  stale: boolean;
  generated: GeneratedConfiguration | null;
  format: string;
  quantity: string;
  country: LookupOption | null;
  city: LookupOption | null;
  asn: LookupOption | null;
  session: "sticky" | "rotating";
  onCopy: () => void;
  onDownload: () => void;
  onClear: () => void;
}
export default function ResultPanel({
  lines,
  isGenerating,
  notice,
  error,
  stale,
  generated,
  format,
  quantity,
  country,
  city,
  asn,
  session,
  onCopy,
  onDownload,
  onClear,
}: Props) {
  const card = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!generated) return;
    heading.current?.focus({ preventScroll: true });
    card.current?.scrollIntoView?.({
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }, [generated]);

  const configurationItems = [
    { label: "Protocol", value: (generated?.format ?? format).toUpperCase() },
    {
      label: "Session type",
      value:
        (generated?.session ?? session) === "sticky" ? "Sticky" : "Rotating",
    },
    {
      label: "Quantity",
      value: generated?.quantity ?? (quantity || "Not entered"),
    },
    {
      label: "Country",
      value: generated?.country ?? country?.label ?? "Any country",
    },
    { label: "City", value: generated?.city ?? city?.label ?? "Any city" },
    {
      label: "ISP / ASN",
      value:
        generated?.network ??
        (asn ? `${asn.label} (AS${asn.value})` : "Any network"),
    },
    { label: "Gateway", value: "residential.byteful.com" },
    { label: "Port", value: 8000 },
  ];

  return (
    <div className={styles["output-column"]}>
      <section
        ref={card}
        className={styles["result-card"]}
        aria-labelledby="result-title"
      >
        <div className={styles["result-heading"]}>
          <div>
            <Terminal size={19} />
            <h2
              ref={heading}
              id="result-title"
              tabIndex={-1}
              aria-describedby={generated ? "generation-status" : undefined}
            >
              Your proxy list
            </h2>
          </div>
          <div className={styles["result-actions"]}>
            <span
              className={`${styles["result-count"]} ${lines.length ? styles.ready : ""}`}
            >
              {lines.length
                ? `${lines.length.toLocaleString()} proxies`
                : "Ready when you are"}
            </span>
            <button
              type="button"
              className={styles["clear-button"]}
              title="Clear proxy list"
              disabled={!lines.length || isGenerating}
              onClick={onClear}
            >
              <Trash2 size={15} /> Clear
            </button>
          </div>
        </div>
        {generated && (
          <p
            id="generation-status"
            className={styles["generation-status"]}
            role="status"
          >
            <CheckCheck size={16} />
            Generation complete — {lines.length.toLocaleString()} proxies ready.
          </p>
        )}
        <div className={styles["terminal-toolbar"]}>
          <div className={styles["terminal-file"]}>
            <FileText size={14} /> residential-proxies.txt
          </div>
          <span>PLAIN TEXT</span>
        </div>
        <div className={styles["terminal-body"]} aria-busy={isGenerating}>
          {lines.length ? (
            <div
              className={styles["proxy-lines"]}
              tabIndex={0}
              role="region"
              aria-label="Generated proxy strings"
            >
              {generated?.displayLines.map((line, i) => (
                <div className={styles["proxy-line"]} key={i}>
                  <span className={styles["line-number"]} aria-hidden="true">
                    {i + 1}
                  </span>
                  <code>
                    <span className={styles["code-protocol"]}>
                      {line.split("://")[0]}://
                    </span>
                    {line.slice(line.indexOf("://") + 3)}
                  </code>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles["empty-output"]}>
              <div className={styles["orbital"]}>
                <span className={styles["orbit"]} />
                <span
                  className={[styles["orbit"], styles["orbit-two"]].join(" ")}
                />
                <span
                  className={[styles["orbit-point"], styles["point-one"]].join(
                    " ",
                  )}
                />
                <span
                  className={[styles["orbit-point"], styles["point-two"]].join(
                    " ",
                  )}
                />
                <div className={styles["orbital-core"]}>
                  <Globe2 size={44} strokeWidth={1.1} />
                </div>
              </div>
              <h3>Your connections start here</h3>
              <p>
                Set your credentials, choose your options,
                <br />
                and generate your first proxy list.
              </p>
              <span className={styles["empty-code"]}>
                protocol://user:pass@host:8000
              </span>
            </div>
          )}
        </div>
        <div className={styles["terminal-footer"]}>
          <span>
            <LockKeyhole size={13} />{" "}
            {generated
              ? `${generated.format.toUpperCase()} · ${generated.session === "sticky" ? "Unique sticky sessions" : "Rotating connections"}`
              : "Secure by configuration"}
          </span>
        </div>
        <div className={styles["export-bar"]}>
          <button
            type="button"
            className={styles["copy-button"]}
            disabled={!lines.length || isGenerating}
            onClick={onCopy}
          >
            {notice.startsWith("Copied") ? (
              <CheckCheck size={16} />
            ) : (
              <Copy size={16} />
            )}{" "}
            Copy all
          </button>
          <button
            type="button"
            className={styles["download-button"]}
            disabled={!lines.length || isGenerating}
            onClick={onDownload}
          >
            <Download size={16} /> Download .txt
          </button>
        </div>
      </section>
      <div className={styles["feedback"]} aria-live="polite">
        {notice && (
          <p className={styles["success-message"]}>
            <Check size={16} />
            {notice}
          </p>
        )}
        {error && (
          <p className={styles["error-message"]} role="alert">
            {error}
          </p>
        )}
        {stale && (
          <p className={styles["stale-message"]}>
            Your setup has changed. Generate again to update this list.
          </p>
        )}
      </div>
      <section
        className={styles["summary-card"]}
        aria-label="Connection configuration"
      >
        <div className={styles["summary-heading"]}>
          <Activity size={17} />
          <h2>
            {generated ? "Generated configuration" : "Connection at a glance"}
          </h2>
        </div>
        <dl>
          {configurationItems.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <p className={styles["session-note"]}>
        <Sparkles size={15} />
        <span>
          {(generated?.session ?? session) === "sticky"
            ? "Sticky sessions use a unique session ID for each proxy in your list."
            : "Rotating entries are identical. The gateway selects a new IP on each request."}
        </span>
      </p>
    </div>
  );
}
