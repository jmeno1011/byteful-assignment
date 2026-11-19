// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Generator from "../src/components/generator";

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.includes("/residential/list")) {
      const body = JSON.parse(String(init?.body));
      return Response.json({
        data: Array.from(
          { length: body.list_count },
          () =>
            "http://alice_s_ABCDEFGHIJKLMNOP:secret@residential.byteful.com:8000",
        ),
        message: "Residential list successfully generated.",
      });
    }
    if (url.includes("countries"))
      return Response.json({
        data: [{ value: "gb", label: "United Kingdom", nodeCount: 100 }],
        page: 1,
        hasMore: false,
      });
    if (url.includes("cities"))
      return Response.json({
        data: [{ value: "london", label: "London" }],
        page: 1,
        hasMore: false,
      });
    return Response.json({
      data: [{ value: "2856", label: "British Telecommunications PLC" }],
      page: 1,
      hasMore: false,
    });
  });
});
afterEach(cleanup);

describe("generator user flow", () => {
  it.each([200, 500])(
    "blocks repeated submissions for at least 300ms even with a fast HTTP %i response",
    async (status) => {
      const user = userEvent.setup();
      render(<Generator />);
      await user.type(screen.getByLabelText("Proxy user ID"), "alice");
      await user.type(screen.getByLabelText("Proxy password"), "secret");
      vi.mocked(fetch).mockResolvedValue(
        Response.json(
          status === 200
            ? { data: [], message: "Generated." }
            : { error: "internal_error", message: "Retry." },
          { status },
        ),
      );
      vi.useFakeTimers();
      try {
        const form = screen.getByRole("form", { name: "Proxy configuration" });
        await act(async () => {
          fireEvent.submit(form);
          fireEvent.submit(form);
        });
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(
          screen.getByRole("button", { name: "Generating proxies…" }),
        ).toBeDisabled();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(299);
        });
        expect(
          screen.getByRole("button", { name: "Generating proxies…" }),
        ).toBeDisabled();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1);
        });
        expect(
          screen.getByRole("button", { name: "Generate proxies" }),
        ).toBeEnabled();
        expect(fetch).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it("keeps generation disabled beyond 300ms until a slow request finishes", async () => {
    const user = userEvent.setup();
    render(<Generator />);
    await user.type(screen.getByLabelText("Proxy user ID"), "alice");
    await user.type(screen.getByLabelText("Proxy password"), "secret");
    let finish!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
    );
    vi.useFakeTimers();
    try {
      await act(async () => {
        fireEvent.submit(
          screen.getByRole("form", { name: "Proxy configuration" }),
        );
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(
        screen.getByRole("button", { name: "Generating proxies…" }),
      ).toBeDisabled();
      await act(async () => {
        finish(Response.json({ data: [], message: "Generated." }));
      });
      expect(
        screen.getByRole("button", { name: "Generate proxies" }),
      ).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("summarizes every option including optional defaults and keeps the generated snapshot", async () => {
    const user = userEvent.setup();
    render(<Generator />);
    await user.type(screen.getByLabelText("Proxy user ID"), "alice");
    await user.type(screen.getByLabelText("Proxy password"), "secret");
    await user.clear(screen.getByLabelText("Quantity"));
    await user.type(screen.getByLabelText("Quantity"), "2");
    await user.click(screen.getByRole("button", { name: "Generate proxies" }));
    await screen.findByText("2 proxies generated successfully.");
    const summary = within(
      screen.getByRole("region", { name: "Connection configuration" }),
    );
    for (const label of [
      "Protocol",
      "Session type",
      "Quantity",
      "Country",
      "City",
      "ISP / ASN",
      "Gateway",
      "Port",
    ]) {
      expect(summary.getByText(label, { exact: true })).toBeInTheDocument();
    }
    for (const value of [
      "HTTP",
      "Sticky",
      "2",
      "Any country",
      "Any city",
      "Any network",
    ]) {
      expect(summary.getByText(value, { exact: true })).toBeInTheDocument();
    }
    await user.click(screen.getByRole("radio", { name: /Rotating/ }));
    await user.type(screen.getByLabelText("Proxy user ID"), "-changed");
    expect(summary.getByText("Sticky", { exact: true })).toBeInTheDocument();
    expect(
      summary.queryByText("Proxy user ID", { exact: true }),
    ).not.toBeInTheDocument();
    expect(
      summary.queryByText("Proxy password", { exact: true }),
    ).not.toBeInTheDocument();
    expect(
      summary.queryByText("alice", { exact: true }),
    ).not.toBeInTheDocument();
    expect(
      summary.queryByText("se**et", { exact: true }),
    ).not.toBeInTheDocument();
  });

  it("explains an empty quantity when submitting with credentials", async () => {
    const user = userEvent.setup();
    render(<Generator />);
    await user.type(screen.getByLabelText("Proxy user ID"), "alice");
    await user.type(screen.getByLabelText("Proxy password"), "secret");
    await user.clear(screen.getByLabelText("Quantity"));
    await user.click(screen.getByRole("button", { name: "Generate proxies" }));
    expect(screen.getByLabelText("Quantity")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByText("Enter a whole number from 1 to 1,000."),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    {
      userId: "",
      password: "",
      focus: "Proxy user ID",
      missing: ["Proxy user ID", "Proxy password"],
    },
    {
      userId: "alice",
      password: "",
      focus: "Proxy password",
      missing: ["Proxy password"],
    },
    {
      userId: "",
      password: "secret",
      focus: "Proxy user ID",
      missing: ["Proxy user ID"],
    },
  ])(
    "explains missing credentials and focuses the first missing field: $focus",
    async ({ userId, password, focus, missing }) => {
      const user = userEvent.setup();
      render(<Generator />);
      if (userId)
        await user.type(screen.getByLabelText("Proxy user ID"), userId);
      if (password)
        await user.type(screen.getByLabelText("Proxy password"), password);
      await user.click(
        screen.getByRole("button", { name: "Generate proxies" }),
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please complete the highlighted fields.",
      );
      for (const label of missing)
        expect(screen.getByLabelText(label)).toHaveAttribute(
          "aria-invalid",
          "true",
        );
      expect(screen.getByLabelText(focus)).toHaveFocus();
      expect(fetch).not.toHaveBeenCalled();
      await user.type(screen.getByLabelText(focus), "filled");
      expect(screen.getByLabelText(focus)).not.toHaveAttribute(
        "aria-invalid",
        "true",
      );
    },
  );

  it("uses A–Z sorting automatically without a sort control", async () => {
    const user = userEvent.setup();
    render(<Generator />);
    expect(screen.queryByLabelText("Sort results")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Country/ }));
    await screen.findByRole("option", { name: /United Kingdom/ });
    expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toContain(
      "sort=asc",
    );
  });

  it("releases quantity focus on wheel so browser scrolling cannot step its value", async () => {
    const user = userEvent.setup();
    render(<Generator />);
    const quantity = screen.getByLabelText("Quantity");
    await user.click(quantity);
    expect(quantity).toHaveFocus();
    fireEvent.wheel(quantity, { deltaY: 100 });
    expect(quantity).not.toHaveFocus();
    expect(quantity).toHaveValue(100);
  });

  it("prevents empty credentials, submits options and enables copying only after generation", async () => {
    const user = userEvent.setup();
    render(<Generator />);
    expect(
      screen.getByRole("button", { name: "Generate proxies" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Copy all" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /City/ })).toBeDisabled();
    await user.type(screen.getByLabelText("Proxy user ID"), "alice");
    await user.type(screen.getByLabelText("Proxy password"), "secret");
    await user.clear(screen.getByLabelText("Quantity"));
    await user.type(screen.getByLabelText("Quantity"), "2");
    await user.click(screen.getByRole("button", { name: "Generate proxies" }));
    expect(
      await screen.findByText("2 proxies generated successfully."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Your proxy list" }),
    ).toHaveFocus();
    expect(
      screen.getByText("Generation complete — 2 proxies ready."),
    ).toBeInTheDocument();
    const preview = screen.getByRole("region", {
      name: "Generated proxy strings",
    });
    expect(preview).toHaveTextContent(":se**et@residential.byteful.com:8000");
    expect(preview).not.toHaveTextContent(":secret@");
    expect(screen.getByRole("button", { name: "Copy all" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Download .txt" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Copy all" }));
    expect(
      await screen.findByText("Copied 2 proxies to clipboard."),
    ).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(
      "http://alice_s_ABCDEFGHIJKLMNOP:secret@residential.byteful.com:8000\nhttp://alice_s_ABCDEFGHIJKLMNOP:secret@residential.byteful.com:8000",
    );
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(
      screen.queryByRole("region", { name: "Generated proxy strings" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Generation complete — 2 proxies ready."),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Your connections start here")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy all" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Download .txt" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Proxy user ID")).toHaveValue("alice");
    expect(
      screen.getByRole("button", { name: "Generate proxies" }),
    ).toBeEnabled();
  });
  it("clears dependent city and ASN when the country is cleared", async () => {
    const user = userEvent.setup();
    render(<Generator />);
    await user.click(screen.getByRole("button", { name: /Country/ }));
    await user.click(
      await screen.findByRole("option", { name: /United Kingdom/ }),
    );
    await user.click(screen.getByRole("button", { name: /City/ }));
    await user.click(await screen.findByRole("option", { name: /London/ }));
    await user.click(screen.getByRole("button", { name: /ISP \/ ASN/ }));
    await user.click(
      await screen.findByRole("option", { name: /British Telecommunications/ }),
    );
    await user.click(screen.getByRole("button", { name: /Country/ }));
    await user.click(screen.getByRole("option", { name: "Any country" }));
    expect(screen.getByRole("button", { name: /City/ })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /ISP \/ ASN/ }),
    ).toHaveTextContent("Any network");
  });
  it("debounces location search and gives actionable empty results", async () => {
    const user = userEvent.setup();
    render(<Generator />);
    await user.click(screen.getByRole("button", { name: /Country/ }));
    await screen.findByRole("option", { name: /United Kingdom/ });
    vi.mocked(fetch).mockClear();
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ data: [], page: 1, hasMore: false }),
    );
    await user.type(
      screen.getByRole("combobox", { name: "Search Country" }),
      "Atlantis",
    );
    await waitFor(() =>
      expect(
        screen.getByText("No matches. Try another search."),
      ).toBeInTheDocument(),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("q=Atlantis");
  });
  it("displays server errors and lets the user try generation again", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        { error: "internal_error", message: "Please try again." },
        { status: 500 },
      ),
    );
    render(<Generator />);
    await user.type(screen.getByLabelText("Proxy user ID"), "alice");
    await user.type(screen.getByLabelText("Proxy password"), "secret");
    await user.click(screen.getByRole("button", { name: "Generate proxies" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please try again.",
    );
    expect(
      screen.getByRole("button", { name: "Generate proxies" }),
    ).toBeEnabled();
  });
  it("clears stale search choices and restores keyboard selection after clearing search", async () => {
    const user = userEvent.setup();
    render(<Generator />);
    await user.click(screen.getByRole("button", { name: /Country/ }));
    await screen.findByRole("option", { name: /United Kingdom/ });
    const search = screen.getByRole("combobox", { name: "Search Country" });
    await user.type(search, "United");
    await screen.findByRole("option", { name: /United Kingdom/ });
    await user.keyboard("{ArrowDown}");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(
      screen.queryByRole("option", { name: /United Kingdom/ }),
    ).not.toBeInTheDocument();
    expect(search).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: "Any country" }).id,
    );
  });
  it("exports all generated lines as a text file with the expected filename", async () => {
    const user = userEvent.setup();
    const create = vi.fn((_blob: Blob) => "blob:test-output");
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        data: [
          "http://alice_s_ABCDEFGHIJKLMNOP:secretpass@residential.byteful.com:8000",
          "http://alice_s_QRSTUVWXYZ012345:secretpass@residential.byteful.com:8000",
        ],
        message: "Generated.",
      }),
    );
    const OriginalURL = URL;
    vi.stubGlobal(
      "URL",
      class extends OriginalURL {
        static createObjectURL = create;
        static revokeObjectURL = vi.fn();
      },
    );
    let filename = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      filename = this.download;
    });
    render(<Generator />);
    await user.type(screen.getByLabelText("Proxy user ID"), "alice");
    await user.type(screen.getByLabelText("Proxy password"), "secret");
    await user.click(screen.getByRole("button", { name: "Generate proxies" }));
    await screen.findByText("2 proxies generated successfully.");
    await user.click(screen.getByRole("button", { name: "Download .txt" }));
    expect(filename).toBe("byteful-residential-proxies.txt");
    const blob = create.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("text/plain;charset=utf-8");
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    expect(text).toBe(
      "http://alice_s_ABCDEFGHIJKLMNOP:secretpass@residential.byteful.com:8000\nhttp://alice_s_QRSTUVWXYZ012345:secretpass@residential.byteful.com:8000",
    );
    vi.unstubAllGlobals();
  });
});
