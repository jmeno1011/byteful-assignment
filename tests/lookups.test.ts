import { beforeEach, describe, expect, it, vi } from "vitest";
import { lookup, clearLookupCache } from "../src/lib/server/byteful";
import { GET } from "../src/app/api/lookups/[kind]/route";

const country = {
  country_id: "gb",
  country_name: "United Kingdom",
  country_node_count: 123,
};
const city = {
  city_alias: "london",
  city_name: "London",
  subdivision_id: "gb-eng",
  city_node_count: 24,
};
const asn = {
  asn_id: 2856,
  asn_name: "British Telecommunications PLC",
  country_id: "gb",
  asn_node_count: 12,
};
const response = (data: unknown[], total = data.length) =>
  Response.json({
    data,
    total_count: total,
    page: 1,
    per_page: 50,
    item_count: data.length,
    message: "Successful.",
  });

beforeEach(() => {
  clearLookupCache();
  vi.stubEnv("BYTEFUL_API_PUBLIC_KEY", "test-public");
  vi.stubEnv("BYTEFUL_API_PRIVATE_KEY", "test-private");
});

describe("Byteful lookup adapter", () => {
  it("keeps ascending and descending lookup pages in separate cache entries", async () => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => response([country]));
    await lookup("countries", { sort: "asc" });
    await lookup("countries", { sort: "desc" });
    await lookup("countries", { sort: "asc" });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      new URL(String(fetcher.mock.calls[0][0])).searchParams.get("sort_by"),
    ).toBe("country_name_asc");
    expect(
      new URL(String(fetcher.mock.calls[1][0])).searchParams.get("sort_by"),
    ).toBe("country_name_desc");
  });

  it("normalizes countries, caches replies and deduplicates concurrent requests", async () => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => response([country], 250));
    const [a, b] = await Promise.all([
      lookup("countries", {}),
      lookup("countries", {}),
    ]);
    expect(a).toEqual({
      data: [{ value: "gb", label: "United Kingdom", nodeCount: 123 }],
      page: 1,
      hasMore: true,
    });
    expect(b).toEqual(a);
    await lookup("countries", {});
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(
      new URL(String(fetcher.mock.calls[0][0])).searchParams.get("sort_by"),
    ).toBe("country_name_asc");
    const init = fetcher.mock.calls[0][1];
    expect(init?.headers).toEqual({
      "X-API-Public-Key": "test-public",
      "X-API-Private-Key": "test-private",
    });
  });
  it("encodes the subdivision wildcard and substring search, and requests subsequent pages", async () => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => response([city], 51));
    const result = await lookup("cities", {
      country: "gb",
      q: "London",
      page: 2,
    });
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.searchParams.get("like_subdivision_id")).toBe("gb%");
    expect(url.toString()).toContain("gb%25");
    expect(url.searchParams.get("like_city_name")).toBe("%London%");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("sort_by")).toBe("city_name_asc");
    expect(result.data[0]).toEqual({
      value: "london",
      label: "London",
      detail: "gb-eng",
      nodeCount: 24,
    });
    expect(result.hasMore).toBe(false);
  });
  it("allows independent ASN lookup and scopes it when country is chosen", async () => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => response([asn]));
    expect((await lookup("asns", { q: "2856" })).data[0].value).toBe("2856");
    expect(
      new URL(String(fetcher.mock.calls[0][0])).searchParams.get("asn_id"),
    ).toBe("2856");
    expect(
      new URL(String(fetcher.mock.calls[0][0])).searchParams.has("country_id"),
    ).toBe(false);
    await lookup("asns", { country: "gb", q: "British" });
    expect(
      new URL(String(fetcher.mock.calls[1][0])).searchParams.get("sort_by"),
    ).toBe("asn_name_asc");
    expect(
      new URL(String(fetcher.mock.calls[1][0])).searchParams.get("country_id"),
    ).toBe("gb");
    expect(
      new URL(String(fetcher.mock.calls[1][0])).searchParams.get(
        "like_asn_name",
      ),
    ).toBe("%British%");
  });
  it.each([401, 403, 429, 500])(
    "maps upstream %i safely without leaking its body",
    async (status) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("secret upstream details", {
          status,
          headers: { "Retry-After": "7" },
        }),
      );
      const res = await GET(
        new Request("http://localhost/api/lookups/countries"),
        { params: Promise.resolve({ kind: "countries" }) },
      );
      expect(res.status).toBe(status === 429 ? 429 : 502);
      const body = await res.json();
      expect(body).toEqual({
        error: expect.any(String),
        message: expect.any(String),
      });
      expect(JSON.stringify(body)).not.toMatch(/secret|test-private/);
      if (status === 429) expect(res.headers.get("Retry-After")).toBe("7");
    },
  );
  it("does not cache failures, maps network errors and can recover", async () => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockImplementation(async () => response([country]));
    await expect(lookup("countries", {})).rejects.toMatchObject({
      code: "upstream_unavailable",
      status: 502,
    });
    expect((await lookup("countries", {})).data).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([
    { nonsense: true },
    { data: [{ country_id: "gb" }], total_count: 1 },
  ])("rejects a malformed upstream payload", async (payload) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(payload));
    await expect(lookup("countries", {})).rejects.toMatchObject({
      code: "upstream_response_invalid",
      status: 502,
    });
  });
  it("reports missing configuration before sending a request", async () => {
    vi.stubEnv("BYTEFUL_API_PRIVATE_KEY", "");
    const fetcher = vi.spyOn(globalThis, "fetch");
    await expect(lookup("countries", {})).rejects.toMatchObject({
      code: "configuration_error",
      status: 503,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    "cities",
    "other",
    "countries?country=GB",
    "countries?page=0",
    "countries?page=1.5",
    "countries?sort=random",
  ])("rejects invalid lookup query %s", async (path) => {
    const [kind] = path.split("?");
    const res = await GET(new Request(`http://localhost/api/lookups/${path}`), {
      params: Promise.resolve({ kind }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: expect.any(String),
      message: expect.any(String),
    });
  });
});
