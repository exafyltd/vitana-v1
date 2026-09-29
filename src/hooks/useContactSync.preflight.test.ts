/**
 * VTID-04440 — contact import review fixes on PR #1137:
 *  - every selected source is checked before any import starts, so a source
 *    that still needs connecting cannot leave the others half-imported;
 *  - the totals come from exact counts, not from the bounded preview list.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const client = vi.hoisted(() => ({
  fetchConnectedApps: vi.fn(),
  syncConnectedApp: vi.fn(),
  importAndroidContacts: vi.fn(),
  pickDeviceContacts: vi.fn(),
  contactPickerSupported: vi.fn(() => true),
}));
vi.mock("@/lib/connected-apps-client", () => client);
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));

type Result = { data?: unknown; error?: unknown; count?: number | null };
const queue: Result[] = [];
function builder(): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "order", "limit", "not", "maybeSingle"]) b[m] = () => b;
  b.then = (resolve: (r: Result) => unknown) => resolve(queue.shift() ?? { data: [], error: null, count: 0 });
  return b;
}
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => builder() } }));

import { useContactSync, ConnectAppFirst } from "./useContactSync";

beforeEach(() => {
  vi.clearAllMocks();
  queue.length = 0;
});

describe("useContactSync", () => {
  it("refuses before importing anything when a later source is not connected", async () => {
    client.fetchConnectedApps.mockResolvedValue([
      { id: "google-contacts", status: "on" },
      { id: "outlook-contacts", status: "off" },
    ]);
    const { result } = renderHook(() => useContactSync());
    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.syncContacts(["google", "outlook"]);
      } catch (e) {
        thrown = e;
      }
    });
    expect(thrown).toBeInstanceOf(ConnectAppFirst);
    expect((thrown as ConnectAppFirst).app).toBe("outlook-contacts");
    expect(client.syncConnectedApp).not.toHaveBeenCalled();
  });

  it("refuses before importing when the phone book picker is unavailable", async () => {
    client.fetchConnectedApps.mockResolvedValue([{ id: "google-contacts", status: "on" }]);
    client.contactPickerSupported.mockReturnValue(false);
    const { result } = renderHook(() => useContactSync());
    await act(async () => {
      await expect(result.current.syncContacts(["google", "phonebook"])).rejects.toThrow("Contact Picker");
    });
    expect(client.syncConnectedApp).not.toHaveBeenCalled();
  });

  it("reports exact totals when the preview is capped", async () => {
    client.contactPickerSupported.mockReturnValue(true);
    client.fetchConnectedApps.mockResolvedValue([{ id: "google-contacts", status: "on" }]);
    client.syncConnectedApp.mockResolvedValue({ ok: true });
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: `c${i}`,
      contact_name: `Name ${i}`,
      contact_phone: null,
      contact_email: null,
      contact_user_id: null,
      is_on_platform: false,
    }));
    const { result } = renderHook(() => useContactSync());
    // Let the mount-time consent read settle before queueing the import reads.
    await act(async () => {});
    queue.length = 0;
    queue.push({ data: rows, error: null, count: 1234 }, { data: null, error: null, count: 42 });
    let r: Awaited<ReturnType<typeof result.current.syncContacts>> | undefined;
    await act(async () => {
      r = await result.current.syncContacts(["google"]);
    });
    expect(r?.nonMatches).toHaveLength(3);
    expect(r?.totalImported).toBe(1234);
    expect(r?.totalMatches).toBe(42);
    expect(r?.truncated).toBe(true);
  });
});
