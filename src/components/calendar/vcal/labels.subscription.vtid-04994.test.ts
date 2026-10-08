/**
 * VTID-04994 — subscription entries get a source label and a localised title
 * chosen by metadata.kind (the database title is only an English fallback).
 */
import { describe, expect, it } from "vitest";
import type { CalendarWindowItem } from "@/lib/calendar-window-client";
import { entryTitle, sourceLabel } from "./labels";

const entry = (source_type: string, kind?: string, title = "Premium renews") => ({
  title, source_type, source_ref_type: "subscription_period_end", event_type: "personal", status: "confirmed",
  metadata: kind ? { kind } : null,
});
const item = (e: ReturnType<typeof entry>) =>
  ({ id: "e1", event_id: "e1", start_time: "2026-11-10T10:00:00Z", end_time: "2026-11-10T10:15:00Z", busy: false, occurrence_index: null, event: e }) as unknown as CalendarWindowItem;

describe("subscription entries (VTID-04994)", () => {
  it("has its own source label", () => {
    const label = sourceLabel(item(entry("subscription", "renews")));
    expect(label).toBeTruthy();
    expect(label).not.toMatch(/^vcal\./);
  });

  it("shows a localised title per kind, not the stored English text", () => {
    const renews = entryTitle(entry("subscription", "renews"));
    const ends = entryTitle(entry("subscription", "ends", "Premium ends"));
    const trial = entryTitle(entry("subscription", "trial_ends", "Trial ends"));
    for (const v of [renews, ends, trial]) expect(v).not.toMatch(/^vcal\./);
    expect(new Set([renews, ends, trial]).size).toBe(3);
  });

  it("every other entry keeps its own title", () => {
    expect(entryTitle(entry("manual", undefined, "Dentist"))).toBe("Dentist");
    expect(entryTitle(entry("subscription", "unknown-kind", "Fallback"))).toBe("Fallback");
  });
});
