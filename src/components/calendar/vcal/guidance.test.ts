/**
 * VTID-04536 — Vitana's one suggestion on today's calendar.
 */
import { describe, expect, it } from "vitest";
import { largestFreeWindow, pickGuidance, type GuidanceInput } from "./guidance";
import type { CalendarWindowItem } from "@/lib/calendar-window-client";

// A local-time date on 5 Oct 2026, so the tests hold in any timezone.
const at = (h: number, m = 0) => new Date(2026, 9, 5, h, m, 0, 0);

function item(id: string, start: Date, end: Date | null, over: Record<string, unknown> = {}): CalendarWindowItem {
  return {
    id,
    event_id: id,
    start_time: start.toISOString(),
    end_time: end ? end.toISOString() : null,
    busy: false,
    occurrence_index: null,
    event: { id, title: id, completion_status: null, completed_at: null, event_type: "personal", status: "confirmed", ...over } as never,
  } as CalendarWindowItem;
}

const base = (over: Partial<GuidanceInput> = {}): GuidanceInput => ({
  now: at(9),
  today: [],
  openSteps: [],
  calendarConnected: true,
  ...over,
});

describe("pickGuidance (VTID-04536)", () => {
  it("empty day suggests something to do", () => {
    expect(pickGuidance(base())).toEqual({ kind: "freeDay" });
  });

  it("open journey steps come first when the day is not finished", () => {
    const g = pickGuidance(base({ openSteps: [{ id: "s1", title: "Respond to your matches" }, { id: "s2", title: "x" }] }));
    expect(g).toEqual({ kind: "nextStep", title: "Respond to your matches", openCount: 2, stepId: "s1" });
  });

  it("a day where everything is done says so, even with open steps", () => {
    const today = [item("a", at(7), at(8), { completion_status: "completed" })];
    expect(pickGuidance(base({ today, openSteps: [{ id: "s", title: "t" }] }))).toEqual({ kind: "allDone", count: 1 });
  });

  it("finds a free window of two hours or more before 21:00", () => {
    const today = [item("a", at(9, 30), at(10)), item("b", at(18), at(19))];
    const g = pickGuidance(base({ today }));
    expect(g?.kind).toBe("freeWindow");
    if (g?.kind === "freeWindow") {
      expect(g.from.getHours()).toBe(10);
      expect(g.to.getHours()).toBe(18);
    }
  });

  it("suggests connecting a calendar when the day has no free window and nothing is connected", () => {
    const today = [item("a", at(9), at(12)), item("b", at(12), at(15)), item("c", at(15), at(18)), item("d", at(18), at(21))];
    expect(pickGuidance(base({ today, calendarConnected: false }))).toEqual({ kind: "connect" });
  });

  it("does not ask to connect while the connection state is unknown", () => {
    const today = [item("a", at(9), at(21))];
    expect(pickGuidance(base({ today, calendarConnected: null }))).toBeNull();
  });

  it("calls a day with six or more things ahead busy", () => {
    const today = Array.from({ length: 6 }, (_, i) => item(`e${i}`, at(9 + 2 * i), at(11 + 2 * i)));
    expect(pickGuidance(base({ today }))).toEqual({ kind: "busy", count: 6 });
  });

  it("ignores busy blocks and work items", () => {
    const busy = { ...item("b", at(10), at(11)), busy: true, event: null } as CalendarWindowItem;
    const work = { ...item("w", at(10), at(11)), work: { kind: "deploy_staging", source_id: "1", params: {} } } as CalendarWindowItem;
    expect(pickGuidance(base({ today: [busy, work] }))).toEqual({ kind: "freeDay" });
  });
});

describe("largestFreeWindow", () => {
  it("rounds the start up to the next quarter hour", () => {
    const w = largestFreeWindow(at(9, 7), []);
    expect(w?.from.getMinutes()).toBe(15);
    expect(w?.to.getHours()).toBe(21);
  });

  it("returns nothing in the evening", () => {
    expect(largestFreeWindow(at(21, 30), [])).toBeNull();
  });

  it("treats an entry without an end as half an hour long", () => {
    const w = largestFreeWindow(at(9), [item("a", at(9), null), item("b", at(11, 20), at(21))]);
    expect(w).toBeNull();
  });
});
