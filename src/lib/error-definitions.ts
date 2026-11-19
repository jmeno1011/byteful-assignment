// Public API error contract. Providers reuse these codes and HTTP statuses.
export const errorDefinitions = {
  invalid_json: { status: 400, message: "Send a valid JSON object." },
  invalid_parameter: { status: 400, message: "Correct the input parameters." },
  configuration_error: { status: 503, message: "The service is not configured." },
  upstream_authentication_failed: { status: 502, message: "The upstream service rejected authentication." },
  rate_limited: { status: 429, message: "Too many requests. Wait a moment, then retry." },
  upstream_unavailable: { status: 502, message: "The upstream service is unavailable. Please retry." },
  upstream_response_invalid: { status: 502, message: "The upstream service returned invalid data." },
  internal_error: { status: 500, message: "Something went wrong. Please try again." },
} as const;

export type ErrorCode = keyof typeof errorDefinitions;
