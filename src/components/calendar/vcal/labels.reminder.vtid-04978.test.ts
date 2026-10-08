/**
 * VTID-04978 — a reminder mirrored into the calendar says where it came from.
 */
import { describe, expect, it } from "vitest";
import type { CalendarWindowItem } from "@/lib/calendar-window-client";
import { sourceLabel } from "./labels";

const item = (source_type: string) =>
  ({
    id: "e1", event_id: "e1", start_time: "2026-10-10T10:00:00Z", end_time: "2026-10-10T10:15:00Z", busy: false, occurrence_index: null,
    event: { id: "e1", title: "Call mum", source_type, source_ref_type: "reminder", event_type: "personal", status: "confirmed" },
  }) as unknown as CalendarWindowItem;

describe("sourceLabel (VTID-04978)", () => {
  it("a mirrored reminder gets its own source label, not a blank", () => {
    const label = sourceLabel(item("reminder"));
    expect(label).toBeTruthy();
    expect(label).not.toMatch(/^vcal\.source/);
  });
  it("a manual entry still has none", () => {
    expect(sourceLabel(item("manual"))).toBeNull();
  });
});
