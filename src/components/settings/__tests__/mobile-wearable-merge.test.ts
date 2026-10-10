/**
 * VTID-05032 (Health Hub D3): the mobile Connected Apps list and its header
 * count take fitness/health connection state from the gateway only.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

import {
  fitnessIntegrations,
  healthIntegrations,
  getAllIntegrations,
  getConnectionStats,
} from "../integrationData";
import { mergeWearableState, type WearableProvider } from "@/hooks/useWearableProviders";
import { fmtDateTime } from "@/lib/locale-format";

const FITBIT_SYNC = "2026-10-09T08:15:00.000Z";
const fitbitConnected: WearableProvider[] = [
  { id: "fitbit", display_name: "Fitbit", category: "wearable", status: "connected", last_sync_at: FITBIT_SYNC },
  { id: "oura", display_name: "Oura", category: "wearable", status: "available", last_sync_at: null },
];

describe("mobile wearable merge (VTID-05032)", () => {
  it("the static fitness/health catalog is never connected", () => {
    for (const i of [...fitnessIntegrations, ...healthIntegrations]) {
      expect(i.connected, i.id).toBe(false);
      expect(i.lastSync, i.id).toBeUndefined();
    }
  });

  it("with no providers, nothing in fitness/health is connected", () => {
    const merged = [
      ...mergeWearableState(fitnessIntegrations, []),
      ...mergeWearableState(healthIntegrations, undefined),
    ];
    expect(merged.filter((i) => i.connected)).toHaveLength(0);
  });

  it("with Fitbit connected, the merged list and getConnectionStats count exactly 1", () => {
    const fitness = mergeWearableState(fitnessIntegrations, fitbitConnected);
    const health = mergeWearableState(healthIntegrations, fitbitConnected);
    const connected = [...fitness, ...health].filter((i) => i.connected);
    expect(connected.map((i) => i.id)).toEqual(["fitbit"]);
    expect(connected[0].lastSync).toBe(fmtDateTime(new Date(FITBIT_SYNC)));

    // Header count: only the merged fitness/health lists change it, by exactly 1.
    expect(getConnectionStats([...fitness, ...health]).connected).toBe(1);
    const base = getConnectionStats(
      getAllIntegrations({
        fitness: mergeWearableState(fitnessIntegrations, []),
        health: mergeWearableState(healthIntegrations, []),
      }),
    ).connected;
    const live = getConnectionStats(getAllIntegrations({ fitness, health })).connected;
    expect(live - base).toBe(1);
  });
});
