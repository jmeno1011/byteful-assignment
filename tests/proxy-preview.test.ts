import { describe, expect, it } from "vitest";
import { maskProxyPassword } from "../src/lib/proxy-preview";

describe("proxy password preview", () => {
  it("keeps only the first and last two password characters", () => {
    expect(
      maskProxyPassword(
        "http://alice:password123@residential.byteful.com:8000",
        "password123",
      ),
    ).toBe("http://alice:pa*******23@residential.byteful.com:8000");
  });
  it.each(["a", "ab", "abc", "abcd"])(
    "fully masks a short password %s",
    (password) => {
      expect(
        maskProxyPassword(
          `socks5h://alice:${password}@residential.byteful.com:8000`,
          password,
        ),
      ).toBe(
        `socks5h://alice:${"*".repeat(password.length)}@residential.byteful.com:8000`,
      );
    },
  );
  it("handles password delimiters and matching text in the username without parsing the URL", () => {
    expect(
      maskProxyPassword(
        "https://alice_password123:password123@residential.byteful.com:8000",
        "password123",
      ),
    ).toBe(
      "https://alice_password123:pa*******23@residential.byteful.com:8000",
    );
    expect(
      maskProxyPassword(
        "http://alice:ab:@cd@residential.byteful.com:8000",
        "ab:@cd",
      ),
    ).toBe("http://alice:ab**cd@residential.byteful.com:8000");
  });
  it("does not show a raw proxy if the server reply does not match the submitted credentials", () => {
    expect(
      maskProxyPassword(
        "http://alice:unexpected-secret@residential.byteful.com:8000",
        "password123",
      ),
    ).toBe("Proxy preview unavailable.");
  });
});
