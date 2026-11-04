import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

function toolCall(headers: Record<string, string>) {
  return new NextRequest("https://invoiceflow.example/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer ifk_fixture", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "invoiceflow_whoami", arguments: {} } }),
  });
}

describe("remote MCP forwarding target", () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://invoiceflow.example");
    vi.stubEnv("INVOICEFLOW_PUBLIC_URL", "");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockClear();
  });

  it("never lets request headers choose where the caller's key is sent", async () => {
    await POST(toolCall({ host: "169.254.169.254", "x-forwarded-host": "attacker.example", "x-forwarded-proto": "http" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URL(url).origin).toBe("https://invoiceflow.example");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer ifk_fixture");
  });

  it("uses an explicitly configured public URL when one is set", async () => {
    vi.stubEnv("INVOICEFLOW_PUBLIC_URL", "https://api.invoiceflow.example/");
    await POST(toolCall({ "x-forwarded-host": "attacker.example" }));
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://api.invoiceflow.example/api/dashboard/stats");
  });
});
