"use client";

import { useRef, useState, type FormEvent } from "react";
import { requestSchema, type GeneratorInput } from "./schema";
import { generateProxies } from "./api";
import type { GeneratedConfiguration } from "./types";
import type { LookupOption } from "@/features/locations/types";
import { maskProxyPassword } from "@/lib/proxy-preview";

const GENERATION_COOLDOWN_MS = 300;
export const formats = ["http", "https", "socks5", "socks5h"] as const;

export function useProxyGenerator() {
  const form = useRef<HTMLFormElement>(null);
  const generationLocked = useRef(false);
  const userIdInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const quantityInput = useRef<HTMLInputElement>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [count, setCount] = useState("100");
  const [format, setFormat] = useState<(typeof formats)[number]>("http");
  const [session, setSession] = useState<"sticky" | "rotating">("sticky");
  const [country, setCountry] = useState<LookupOption | null>(null);
  const [city, setCity] = useState<LookupOption | null>(null);
  const [asn, setAsn] = useState<LookupOption | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  // Keep the UI locked until the request and the minimum 300ms cooldown finish.
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [generated, setGenerated] = useState<GeneratedConfiguration | null>(
    null,
  );
  // generate data
  const input: GeneratorInput = {
    proxy_user_id: userId,
    proxy_user_password: password,
    list_count: count === "" ? NaN : Number(count),
    list_format: format,
    list_session_type: session,
    ...(country && { country_id: country.value }),
    ...(city && { city_alias: city.value }),
    ...(asn && { asn_id: Number(asn.value) }),
  };
  // validation check and success/fail check
  const validation = requestSchema.safeParse(input);
  const valid = validation.success;
  const missingUserId = validationAttempted && !userId;
  const missingPassword = validationAttempted && !password;
  const quantityInvalid =
    (count !== "" || validationAttempted) &&
    (!Number.isInteger(Number(count)) ||
      Number(count) < 1 ||
      Number(count) > 1000);
  const stale = generated && generated.signature !== JSON.stringify(input);

  // functions
  // proxies generate
  async function submit(event: FormEvent) {
    event.preventDefault();
    // validation check
    const parsed = requestSchema.safeParse(input);
    if (generationLocked.current) return;
    if (!parsed.success) {
      setValidationAttempted(true);
      const firstInvalid = !userId
        ? userIdInput
        : !password
          ? passwordInput
          : quantityInput;
      firstInvalid.current?.focus({ preventScroll: true });
      form.current?.scrollIntoView?.({
        block: "start",
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")
          .matches
          ? "auto"
          : "smooth",
      });
      return;
    }
    // A ref locks immediately, before React renders the disabled button.
    generationLocked.current = true;
    const minimumDelay = new Promise<void>((resolve) =>
      setTimeout(resolve, GENERATION_COOLDOWN_MS),
    );
    setValidationAttempted(false);
    setIsGenerating(true);
    setError("");
    setNotice("");
    // 
    try {
      const result = await generateProxies(parsed.data);
      await minimumDelay;
      setLines(result.data);
      setGenerated({
        displayLines: result.data.map((line) =>
          maskProxyPassword(line, parsed.data.proxy_user_password),
        ),
        signature: JSON.stringify(input),
        format,
        session,
        quantity: result.data.length,
        country: country?.label ?? "Any country",
        city: city?.label ?? "Any city",
        network: asn ? `${asn.label} (AS${asn.value})` : "Any network",
      });
      setNotice(`${result.data.length} proxies generated successfully.`);
    } catch (err) {
      await minimumDelay;
      setError(
        err instanceof Error
          ? err.message
          : "Generation failed. Please try again.",
      );
    } finally {
      generationLocked.current = false;
      setIsGenerating(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setNotice(`Copied ${lines.length} proxies to clipboard.`);
      setError("");
    } catch {
      setError(
        "Clipboard access was blocked. Download the .txt file or select and copy the proxy list.",
      );
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "byteful-residential-proxies.txt";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Your proxy list was downloaded.");
  }
  function clear() {
    setLines([]);
    setGenerated(null);
    setError("");
    setNotice("Proxy list cleared.");
  }

  return {
    form,
    userIdInput,
    passwordInput,
    quantityInput,
    validationAttempted,
    valid,
    missingUserId,
    missingPassword,
    quantityInvalid,
    userId,
    setUserId,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    count,
    setCount,
    format,
    setFormat,
    session,
    setSession,
    country,
    setCountry,
    city,
    setCity,
    asn,
    setAsn,
    lines,
    isGenerating,
    error,
    notice,
    generated,
    stale,
    submit,
    copy,
    download,
    clear,
  };
}

export type ProxyGeneratorState = ReturnType<typeof useProxyGenerator>;
