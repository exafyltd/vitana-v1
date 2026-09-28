import { describe, it, expect, vi } from "vitest";

const eq = vi.fn().mockResolvedValue({ error: null });
const update = vi.fn(() => ({ eq }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn(() => ({ update })) } }));

import { deviceTimeZone, saveDeviceTimeZone } from "./device-timezone";

describe("saveDeviceTimeZone (VTID-04676)", () => {
  it("saves the device's IANA timezone on the member's own profile", async () => {
    const tz = deviceTimeZone();
    expect(tz).toBeTruthy();
    await saveDeviceTimeZone("user-1");
    expect(update).toHaveBeenCalledWith({ timezone: tz });
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("never throws when the save fails", async () => {
    eq.mockRejectedValueOnce(new Error("offline"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(saveDeviceTimeZone("user-1")).resolves.toBeUndefined();
    warn.mockRestore();
  });
});
