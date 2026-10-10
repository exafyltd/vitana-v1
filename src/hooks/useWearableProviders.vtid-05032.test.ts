/**
 * VTID-05032 (Health Hub D3): the providers call is GET-only and degrades to an
 * empty list — with a warning — on any non-OK response, so a failure is never
 * silent and never shows a fake connection.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }) } },
}));

import { fetchWearableProviders, connectedProvider, type WearableProvider } from "./useWearableProviders";

const fetchMock = vi.fn();
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  vi.unstubAllGlobals();
});

describe("fetchWearableProviders (VTID-05032)", () => {
  it("GETs /api/v1/wearables/providers with the member's token", async () => {
    const providers: WearableProvider[] = [
      { id: "fitbit", display_name: "Fitbit", category: "wearable", status: "available", last_sync_at: null },
    ];
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, providers }) });
    await expect(fetchWearableProviders()).resolves.toEqual(providers);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/v1\/wearables\/providers$/);
    expect(init?.method ?? "GET").toBe("GET");
    expect(init.headers).toEqual({ Authorization: "Bearer tok" });
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns and returns [] on a non-OK response", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    await expect(fetchWearableProviders()).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("warns and returns [] when the body has no provider list", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: false }) });
    await expect(fetchWearableProviders()).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("connectedProvider returns a provider only when the gateway says connected", () => {
    const list: WearableProvider[] = [
      { id: "fitbit", display_name: "Fitbit", category: "wearable", status: "connected", last_sync_at: null },
      { id: "oura", display_name: "Oura", category: "wearable", status: "available", last_sync_at: null },
    ];
    expect(connectedProvider(list, "fitbit")?.id).toBe("fitbit");
    expect(connectedProvider(list, "oura")).toBeNull();
    expect(connectedProvider(undefined, "fitbit")).toBeNull();
  });
});
