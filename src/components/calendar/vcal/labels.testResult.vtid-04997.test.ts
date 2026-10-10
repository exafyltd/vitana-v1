/**
 * VTID-04997 — an expected health-test result gets its own source label; its
 * title is the test name, shown as written. The entry is read-only.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/i18n-toast", () => ({ t: (k: string) => k, getI18nLocale: () => "en" }));

import { sourceLabel, entryTitle } from "./labels";
import { canEditEntry, canRemoveEntry } from "./entry-actions";
import type { CalendarWindowItem } from "@/lib/calendar-window-client";

const entry = (title: string) =>
  ({ id: "e1", title, source_type: "test_result", source_ref_type: "test_result_expected", event_type: "health", status: "confirmed",
     start_time: "2026-10-20T08:00:00Z", end_time: "2026-10-20T08:15:00Z", metadata: { kind: "test_result_expected" } }) as unknown as NonNullable<CalendarWindowItem["event"]>;
const item = (e: ReturnType<typeof entry>) =>
  ({ id: "i1", event_id: "e1", start_time: e.start_time, end_time: e.end_time, busy: false, occurrence_index: null, event: e }) as unknown as CalendarWindowItem;

describe("test result entries (VTID-04997)", () => {
  it("has its own source label", () => {
    expect(sourceLabel(item(entry("Blood panel")))).toBe("vcal.source.testResult");
  });
  it("shows the test name as the title", () => {
    expect(entryTitle(entry("Blood panel"))).toBe("Blood panel");
  });
  it("cannot be edited or removed from the calendar", () => {
    expect(canEditEntry(item(entry("Blood panel")))).toBe(false);
    expect(canRemoveEntry(item(entry("Blood panel")))).toBe(false);
  });
});
