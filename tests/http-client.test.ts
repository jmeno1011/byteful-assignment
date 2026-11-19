import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiResponseError, request } from "../src/lib/http-client";
import { generateProxies } from "../src/features/residential/api";
import { searchLocations } from "../src/features/locations/api";

const schema = z.object({ value: z.string() });
afterEach(() => vi.restoreAllMocks());

describe("validated browser HTTP responses", () => {
  it("returns validated success data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ value: "ok" }),
    );
    await expect(request("/test", schema)).resolves.toEqual({ value: "ok" });
  });

  it.each([null, [], {}, { value: 42 }])(
    "rejects malformed success data %j",
    async (body) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body));
      await expect(request("/test", schema)).rejects.toMatchObject({
        code: "invalid_response",
        status: 200,
      });
    },
  );

  it("preserves valid API errors, including unknown future codes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          error: "future_error",
          message: "Please retry later.",
        },
        { status: 503 },
      ),
    );
    await expect(request("/test", schema)).rejects.toMatchObject({
      code: "future_error",
      message: "Please retry later.",
      status: 503,
    });
  });

  it.each([
    null,
    [],
    {},
    { error: 3, message: {} },
    { error: "", message: "" },
  ])("uses a safe fallback for malformed error data %j", async (body) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(body, { status: 502 }),
    );
    await expect(request("/test", schema)).rejects.toMatchObject({
      code: "request_failed",
      message: "The request failed. Please retry.",
      status: 502,
    });
  });

  it("handles unreadable JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>error</html>", { status: 502 }),
    );
    await expect(request("/test", schema)).rejects.toMatchObject({
      code: "invalid_response",
      status: 502,
    });
  });

  it("preserves aborts and converts network failures", async () => {
    const aborted = new DOMException("Cancelled", "AbortError");
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(aborted)
      .mockRejectedValueOnce(new TypeError("offline"));
    await expect(request("/test", schema)).rejects.toBe(aborted);
    await expect(request("/test", schema)).rejects.toBeInstanceOf(
      ApiResponseError,
    );
  });

  it("validates generated proxy strings before returning them", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        data: [123],
        message: "Generated.",
      }),
    );
    await expect(
      generateProxies({
        proxy_user_id: "demo",
        proxy_user_password: "test",
      }),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("does not cache invalid location replies and allows recovery", async () => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({
          data: [{ value: "gb", label: "UK", nodeCount: -1 }],
          page: 1,
          hasMore: false,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [{ value: "gb", label: "UK", nodeCount: 100 }],
          page: 1,
          hasMore: false,
        }),
      );
    const signal = new AbortController().signal;
    const query = { q: "response-validation-test" };
    await expect(
      searchLocations("countries", query, signal),
    ).rejects.toMatchObject({ code: "invalid_response" });
    await expect(
      searchLocations("countries", query, signal),
    ).resolves.toMatchObject({ page: 1 });
    await searchLocations("countries", query, signal);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
