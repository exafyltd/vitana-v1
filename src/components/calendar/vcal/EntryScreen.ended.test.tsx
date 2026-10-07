/**
 * VTID-04951 — an event or live room that is over says so, and every action
 * on it answers "in the past, not active" instead of walking the member into
 * a dead room. "Ask Vitana" hands the guide this entry's state.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { CalendarEntry, CalendarWindowItem } from "@/lib/calendar-window-client";

const notify = vi.fn();
vi.mock("@/lib/i18n-toast", async () => ({
  ...(await vi.importActual<typeof import("@/lib/i18n-toast")>("@/lib/i18n-toast")),
  t: (key: string) => key,
  notify: (...a: unknown[]) => notify(...a),
}));
vi.mock("@/lib/locale-format", async () => ({
  ...(await vi.importActual<typeof import("@/lib/locale-format")>("@/lib/locale-format")),
  fmtDate: () => "Dienstag, 6. Oktober",
}));
const activateOrbGuide = vi.fn();
vi.mock("@/lib/orbActivate", () => ({ activateOrb: vi.fn(), activateOrbGuide: (...a: unknown[]) => activateOrbGuide(...a) }));

import { EntryScreen } from "./EntryScreen";

const NOW = new Date("2026-10-07T11:55:00Z"); // the day after the room ran

function room(over: Partial<CalendarEntry> = {}): CalendarWindowItem {
  const event: CalendarEntry = {
    id: "e1", title: "Test 10", description: null, start_time: "2026-10-06T17:08:00Z", end_time: "2026-10-06T17:23:00Z",
    location: null, event_type: "community", status: "confirmed", source_type: "live_room",
    source_ref_type: "live_room_session", source_ref_id: "s1", role_context: "community", completion_status: null,
    completed_at: null, wellness_tags: null, pillar: null, rrule: null, emoji: null, attendees_count: null,
    metadata: { live_room_id: "r1" }, ...over,
  };
  return {
    id: "e1", event_id: "e1", start_time: event.start_time, end_time: event.end_time, busy: false,
    occurrence_index: null, event, movable: true,
  };
}

describe("an ended live room (VTID-04951)", () => {
  beforeEach(() => {
    notify.mockClear();
    activateOrbGuide.mockClear();
  });

  it("shows the ended chip and notice", () => {
    render(<EntryScreen item={room()} now={NOW} onClose={() => {}} onComplete={() => {}} onOpenSource={() => {}} />);
    expect(screen.getByTestId("vcal-ended-chip")).toBeTruthy();
    expect(screen.getByTestId("vcal-ended-notice")).toBeTruthy();
  });

  it("mark done, open room and move all answer 'not active' and do nothing else", () => {
    const onComplete = vi.fn();
    const onOpenSource = vi.fn();
    const onMove = vi.fn();
    render(<EntryScreen item={room()} now={NOW} onClose={() => {}} onComplete={onComplete} onOpenSource={onOpenSource} onMove={onMove} />);
    for (const id of ["vcal-complete", "vcal-open-source", "vcal-move"]) {
      fireEvent.click(screen.getByTestId(id));
    }
    expect(notify).toHaveBeenCalledTimes(3);
    expect(notify).toHaveBeenCalledWith("vcal.entry.endedToast");
    expect(onComplete).not.toHaveBeenCalled();
    expect(onOpenSource).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    expect(screen.queryByTestId("vcal-move-picker")).toBeNull();
  });

  it("Ask Vitana opens the guide with the entry's state", () => {
    render(<EntryScreen item={room()} now={NOW} onClose={() => {}} onOpenSource={() => {}} />);
    fireEvent.click(screen.getByText(/vcal\.entry\.askVitana/));
    expect(activateOrbGuide).toHaveBeenCalledWith({ feature: "calendar_entry", state: "ended", kind: "live_room", title: "Test 10" });
  });

  it("a running room is unchanged: no notice, the action works", () => {
    const onOpenSource = vi.fn();
    render(<EntryScreen item={room()} now={new Date("2026-10-06T17:10:00Z")} onClose={() => {}} onOpenSource={onOpenSource} />);
    expect(screen.queryByTestId("vcal-ended-notice")).toBeNull();
    fireEvent.click(screen.getByTestId("vcal-open-source"));
    expect(onOpenSource).toHaveBeenCalledWith("/comm/live-rooms/r1/view");
    expect(notify).not.toHaveBeenCalled();
  });

  it("an own past task keeps working: marking it done is legitimate", () => {
    const onComplete = vi.fn();
    const task = room({ source_type: "manual", source_ref_type: null, source_ref_id: null, event_type: "personal", metadata: null });
    render(<EntryScreen item={task} now={NOW} onClose={() => {}} onComplete={onComplete} />);
    expect(screen.queryByTestId("vcal-ended-notice")).toBeNull();
    fireEvent.click(screen.getByTestId("vcal-complete"));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
