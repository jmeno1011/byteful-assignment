import { describe, expect, it } from "vitest";
import { generateList } from "../src/features/residential/generator";
import { POST } from "../src/app/api/residential/list/route";

const credentials = {
  proxy_user_id: "alice",
  proxy_user_password: "secretpass",
};
describe("residential list contract", () => {
  it("defaults to 100 HTTP sticky proxies with unique 16-character session IDs", () => {
    const lines = generateList(credentials);
    expect(lines).toHaveLength(100);
    expect(new Set(lines).size).toBe(100);
    lines.forEach((line) =>
      expect(line).toMatch(
        /^http:\/\/alice_s_[A-Z0-9]{16}:secretpass@residential\.byteful\.com:8000$/,
      ),
    );
  });
  it.each(["http", "https", "socks5", "socks5h"])(
    "composes every targeting option in the specified order with %s",
    (format) => {
      expect(
        generateList({
          ...credentials,
          list_count: 2,
          list_format: format,
          list_session_type: "rotating",
          country_id: "gb",
          city_alias: "norwich",
          asn_id: 13335,
        }),
      ).toEqual([
        `${format}://alice_c_gb_city_norwich_asn_13335:secretpass@residential.byteful.com:8000`,
        `${format}://alice_c_gb_city_norwich_asn_13335:secretpass@residential.byteful.com:8000`,
      ]);
    },
  );
  it("supports ASN without a country and preserves supplied credentials exactly", () => {
    expect(
      generateList({
        proxy_user_id: " a ",
        proxy_user_password: "p:@",
        asn_id: 42,
        list_count: 1,
        list_session_type: "rotating",
      }),
    ).toEqual(["http:// a _asn_42:p:@@residential.byteful.com:8000"]);
  });
  it("supports the maximum count without repeated sessions", () => {
    const lines = generateList({ ...credentials, list_count: 1000 });
    expect(lines).toHaveLength(1000);
    expect(new Set(lines).size).toBe(1000);
  });
  it.each([
    { list_count: 0 },
    { list_count: 1001 },
    { list_count: 1.5 },
    { list_count: "2" },
    { list_format: "ftp" },
    { list_session_type: "random" },
    { country_id: "GB" },
    { country_id: "usa" },
    { city_alias: "norwich" },
    { asn_id: "42" },
    { proxy_user_id: "" },
    { proxy_user_password: "" },
    { list_count: null },
  ])("rejects invalid values %j", (invalid) => {
    expect(() => generateList({ ...credentials, ...invalid })).toThrow();
  });
  it.each([null, [], "hello", 42])("rejects a non-object body %j", (body) =>
    expect(() => generateList(body)).toThrow(),
  );
  it("returns the documented 200 response and prevents response caching", async () => {
    const res = await POST(
      new Request("http://localhost/api/residential/list", {
        method: "POST",
        body: JSON.stringify({
          ...credentials,
          list_count: 1,
          list_session_type: "rotating",
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: ["http://alice:secretpass@residential.byteful.com:8000"],
      message: "Residential list successfully generated.",
    });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
  it.each(["{bad", JSON.stringify({ ...credentials, list_count: 0 })])(
    "returns consistent 400 errors for malformed or invalid input",
    async (body) => {
      const res = await POST(
        new Request("http://localhost/api/residential/list", {
          method: "POST",
          body,
        }),
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: expect.any(String),
        message: expect.any(String),
      });
    },
  );
});
