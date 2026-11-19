"use client";

import styles from "./lookup-select.module.css";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, LoaderCircle, Search, X } from "lucide-react";
import type {
  LookupKind,
  LookupOption,
  LookupPage,
} from "@/features/locations/types";
import { searchLocations } from "@/features/locations/api";

interface Props {
  label: string;
  kind: LookupKind;
  value: LookupOption | null;
  onChange: (value: LookupOption | null) => void;
  placeholder: string;
  disabled?: boolean;
  country?: string;
  icon: React.ReactNode;
  hint?: string;
}

export default function LookupSelect({
  label,
  kind,
  value,
  onChange,
  placeholder,
  disabled,
  country,
  icon,
  hint,
}: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<LookupPage>({
    data: [],
    page: 1,
    hasMore: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState(0);
  const options = [{ value: "", label: placeholder }, ...result.data];

  // clear point out
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  // options debounce
  useEffect(() => {
    if (!open || disabled) return;
    const controller = new AbortController();
    // One cancellable debounce also protects against stale country/search responses.
    const timer = setTimeout(async () => {
      try {
        const data = await searchLocations(
          kind,
          { q: query.trim(), country, page },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setResult((previous) => ({
          ...data,
          data: page === 1 ? data.data : [...previous.data, ...data.data],
        }));
        setError("");
      } catch (err) {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Search failed. Please retry.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, disabled, query, country, kind, page, attempt]);

  // move scrollview when you scroll options
  useEffect(() => {
    if (open)
      document
        .getElementById(`${id}-option-${active}`)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [active, open, id]);

  function choose(option: LookupOption) {
    onChange(option.value ? option : null);
    setOpen(false);
    trigger.current?.focus();
  }
  function toggle() {
    if (!open) {
      setQuery("");
      setPage(1);
      setActive(0);
      setError("");
      setResult({ data: [], page: 1, hasMore: false });
      setLoading(true);
    }
    setOpen(!open);
  }
  return (
    <div
      className={styles["lookup"]}
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
    >
      <label id={`${id}-label`} htmlFor={`${id}-trigger`}>
        {label} <span className={styles["optional"]}>Optional</span>
      </label>
      <button
        ref={trigger}
        id={`${id}-trigger`}
        type="button"
        className={`${styles["select-trigger"]} ${value ? styles["has-value"] : ""}`}
        disabled={disabled}
        onClick={toggle}
        aria-label={`${label}: ${value?.label || placeholder}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-describedby={hint ? `${id}-hint` : undefined}
      >
        {icon}
        <span>{value?.label || placeholder}</span>
        <ChevronDown size={16} className={open ? styles.turned : ""} />
      </button>
      {hint && (
        <p className={"field-hint"} id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {open && (
        <div className={styles["lookup-popover"]}>
          <div className={styles["lookup-search"]}>
            <Search size={16} />
            <input
              ref={search}
              role="combobox"
              aria-label={`Search ${label}`}
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={`${id}-list`}
              aria-activedescendant={`${id}-option-${active}`}
              placeholder={
                kind === "asns"
                  ? "Search provider or ASN number…"
                  : `Search ${label.toLowerCase()}…`
              }
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
                setActive(0);
                setLoading(true);
                setError("");
                setResult({ data: [], page: 1, hasMore: false });
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((index) => Math.min(index + 1, options.length - 1));
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((index) => Math.max(index - 1, 0));
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (options[active]) choose(options[active]);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                  trigger.current?.focus();
                }
              }}
            />
            {query && (
              <button
                type="button"
                className={"icon-button"}
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                  setActive(0);
                  setError("");
                  setResult({ data: [], page: 1, hasMore: false });
                  setLoading(true);
                  search.current?.focus();
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div
            className={styles["lookup-options"]}
            role="listbox"
            id={`${id}-list`}
            aria-labelledby={`${id}-label`}
          >
            {options.map((option, index) => (
              <button
                type="button"
                key={`${option.value}-${index}`}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={(value?.value || "") === option.value}
                className={`${styles["lookup-option"]} ${active === index ? styles.active : ""}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option)}
              >
                <span>
                  <span className={styles["option-label"]}>{option.label}</span>
                  {option.detail && <small>{option.detail}</small>}
                </span>
                {option.nodeCount !== undefined && (
                  <small className={styles["node-count"]}>
                    {Intl.NumberFormat("en", { notation: "compact" }).format(
                      option.nodeCount,
                    )}{" "}
                    IPs
                  </small>
                )}
                {(value?.value || "") === option.value && <Check size={15} />}
              </button>
            ))}
          </div>
          {loading && (
            <p className={styles["lookup-message"]} role="status">
              <LoaderCircle size={15} className={"spin"} /> Searching…
            </p>
          )}
          {error && (
            <div className={styles["lookup-error"]} role="alert">
              {error}
              <button
                type="button"
                className={"text-button"}
                onClick={() => {
                  setAttempt((a) => a + 1);
                  setLoading(true);
                  setError("");
                }}
              >
                Retry search
              </button>
            </div>
          )}
          {!loading && !error && result.data.length === 0 && (
            <p className={styles["lookup-message"]}>
              No matches. Try another search.
            </p>
          )}
          {!loading && !error && result.hasMore && (
            <button
              type="button"
              className={styles["load-more"]}
              onClick={() => {
                setPage((p) => p + 1);
                setLoading(true);
              }}
            >
              Load more results
            </button>
          )}
        </div>
      )}
    </div>
  );
}
