import { describe, expect, it } from "vitest";
import { ServerError, errorResponse } from "../src/lib/errors";
import { bytefulHttpError } from "../src/lib/server/byteful-errors";

describe("public error contract", () => {
  it.each([
    ["invalid_json", 400],
    ["invalid_parameter", 400],
    ["configuration_error", 503],
    ["upstream_authentication_failed", 502],
    ["rate_limited", 429],
    ["upstream_unavailable", 502],
    ["upstream_response_invalid", 502],
    ["internal_error", 500],
  ] as const)("assigns %s its contract status", async (code, status) => {
    const response = errorResponse(new ServerError(code));
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: code, message: expect.any(String) });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it.each([
    [401, "upstream_authentication_failed"],
    [403, "upstream_authentication_failed"],
    [429, "rate_limited"],
    [404, "upstream_unavailable"],
    [500, "upstream_unavailable"],
  ])("translates Byteful HTTP %i", (status, code) => {
    expect(bytefulHttpError(new Response("private details", { status: Number(status) })).code).toBe(code);
  });

  it.each([["7", "7"], ["invalid", "2"], ["-1", "2"], ["999999", "2"]])(
    "sanitizes Retry-After %s",
    (retry, expected) => {
      const response = errorResponse(bytefulHttpError(new Response(null, {
        status: 429, headers: { "Retry-After": retry },
      })));
      expect(response.headers.get("Retry-After")).toBe(expected);
    },
  );

  it("does not serialize unexpected error details", async () => {
    const response = errorResponse(new Error("secret credentials"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "internal_error", message: "Something went wrong. Please try again.",
    });
  });
});
