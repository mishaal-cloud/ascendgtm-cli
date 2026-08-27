import { describe, it, expect, vi, afterEach } from "vitest";
import { callTool, extractText, extractJson, AscendCliError } from "./mcp-client.js";

function mockFetchOnce(response: {
  ok: boolean;
  status?: number;
  text: string;
}): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      text: () => Promise.resolve(response.text),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("callTool", () => {
  it("returns the parsed result on a successful JSON-RPC response", async () => {
    mockFetchOnce({
      ok: true,
      text: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { content: [{ type: "text", text: "hello" }] },
      }),
    });

    const result = await callTool("ascend_about", {});
    expect(extractText(result)).toBe("hello");
  });

  it("sends the tool name and arguments in the request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [] } }),
        ),
    });
    vi.stubGlobal("fetch", fetchMock);

    await callTool("ascend_check_fit", { arr_usd: 5000000, industry: "B2B SaaS" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://ascend-gateway-v5.ascendgtm.workers.dev/public-mcp");
    const body = JSON.parse(init.body as string);
    expect(body.method).toBe("tools/call");
    expect(body.params.name).toBe("ascend_check_fit");
    expect(body.params.arguments).toEqual({ arr_usd: 5000000, industry: "B2B SaaS" });
  });

  it("throws AscendCliError on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND")),
    );

    await expect(callTool("ascend_about", {})).rejects.toThrow(AscendCliError);
  });

  it("throws AscendCliError on non-2xx response", async () => {
    mockFetchOnce({ ok: false, status: 503, text: "Service Unavailable" });

    await expect(callTool("ascend_about", {})).rejects.toThrow(AscendCliError);
    await expect(callTool("ascend_about", {})).rejects.toThrow(/HTTP 503/);
  });

  it("throws AscendCliError on malformed JSON", async () => {
    mockFetchOnce({ ok: true, text: "not json{{{" });

    await expect(callTool("ascend_about", {})).rejects.toThrow(AscendCliError);
    await expect(callTool("ascend_about", {})).rejects.toThrow(/malformed JSON/);
  });

  it("throws AscendCliError on a JSON-RPC error envelope", async () => {
    mockFetchOnce({
      ok: true,
      text: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32601, message: "Unknown tool" },
      }),
    });

    await expect(callTool("nonexistent_tool", {})).rejects.toThrow(/Unknown tool/);
  });
});

describe("extractJson", () => {
  it("parses JSON out of a text content part", () => {
    const result = { content: [{ type: "text", text: '{"a":1}' }] };
    expect(extractJson(result)).toEqual({ a: 1 });
  });

  it("falls back to raw text when content is not JSON", () => {
    const result = { content: [{ type: "text", text: "plain text" }] };
    expect(extractJson(result)).toBe("plain text");
  });
});
