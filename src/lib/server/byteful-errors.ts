import { ServerError } from "../errors";
import type { ErrorCode } from "../error-definitions";

// TODO: Defining it through a consistent message or get from server
// Byteful-specific text and status translation belong to this adapter.
const messages = {
  configuration_error: "Location search is not configured. Add the Byteful API keys to .env.local and restart the app.",
  upstream_authentication_failed: "Byteful rejected the API keys. Check the server configuration and retry.",
  rate_limited: "Byteful is receiving too many requests. Wait a moment, then retry.",
  upstream_unavailable: "Could not reach Byteful. Check your connection and retry the location search.",
  upstream_response_invalid: "Byteful returned unexpected location data. Please retry.",
} as const satisfies Partial<Record<ErrorCode, string>>;

const httpErrors: Partial<Record<number, keyof typeof messages>> = {
  401: "upstream_authentication_failed",
  403: "upstream_authentication_failed",
  429: "rate_limited",
};

export function bytefulError(code: keyof typeof messages, message?: string): ServerError {
  return new ServerError(code, message ?? messages[code]);
}

// Call only for unsuccessful responses; never expose the upstream response body.
export function bytefulHttpError(response: Response): ServerError {
  const code = httpErrors[response.status] ?? "upstream_unavailable";
  const retry = response.headers.get("Retry-After");
  return new ServerError(
    code,
    code === "upstream_unavailable"
      ? `Byteful location search failed (HTTP ${response.status}). Please retry.`
      : messages[code],
    code === "rate_limited"
      ? (retry && /^\d{1,5}$/.test(retry) ? retry : "2")
      : undefined,
  );
}
