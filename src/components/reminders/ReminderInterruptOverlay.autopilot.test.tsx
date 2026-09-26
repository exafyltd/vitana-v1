/**
 * VTID-04652 (Community Autopilot plan §4.3): a reminder that belongs to an
 * Autopilot slot deep-links into the suggestion when marked done.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

// A plain async stub, not vi.fn(): vitest reports a rejection that passed
// through a mock as a test failure even when the component catches it.
const calls: string[] = [];
let nextResult: unknown = null;
let nextError: unknown = null;
const complete = async (id: string) => {
  calls.push(id);
  if (nextError) throw nextError;
  return nextResult;
};
vi.mock("@/lib/reminders-api", async (orig) => {
  const real = await orig<typeof import("@/lib/reminders-api")>();
  return {
    ...real,
    ackReminder: vi.fn(async () => ({})),
    snoozeReminder: vi.fn(async () => ({})),
    deleteReminder: vi.fn(async () => {}),
    getReminderById: vi.fn(async () => null),
    completeReminderWithSlot: (id: string) => complete(id),
  };
});
const stream = vi.hoisted(() => ({
  latestFire: {
    type: "reminder.fire", reminder_id: "rem-1", action_text: "Evening walk", spoken_message: null,
    description: null, chime_pcm_b64: "", chime_mime: "", voice_audio_b64: null, voice_mime: "",
    voice_lang: "de", fired_at: "2026-09-26T17:00:00Z", next_fire_at: null,
  },
  clear: () => {},
}));
// Stable values: a fresh object per render would re-run the overlay's effect forever.
vi.mock("@/hooks/useReminderStream", () => ({ useReminderStream: () => stream }));

import ReminderInterruptOverlay from "./ReminderInterruptOverlay";
import { autopilotSlotRoute } from "@/lib/reminders-api";

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}</div>;
}

function mount() {
  return render(
    <MemoryRouter initialEntries={["/home"]}>
      <ReminderInterruptOverlay />
      <Routes><Route path="*" element={<Where />} /></Routes>
    </MemoryRouter>,
  );
}

describe("autopilotSlotRoute", () => {
  it("follows an in-app path of a completed slot", () => {
    expect(autopilotSlotRoute({ ok: true, route: "/diary" })).toBe("/diary");
  });
  it("never follows another origin or a failed slot", () => {
    expect(autopilotSlotRoute({ ok: true, route: "//evil.example" })).toBeNull();
    expect(autopilotSlotRoute({ ok: true, route: "https://evil.example" })).toBeNull();
    expect(autopilotSlotRoute({ ok: true, route: "/\\evil.example" })).toBeNull();
    expect(autopilotSlotRoute({ ok: false, route: "/diary" })).toBeNull();
    expect(autopilotSlotRoute(null)).toBeNull();
  });
});

describe("ReminderInterruptOverlay — Mark done on an Autopilot slot", () => {
  beforeEach(() => { calls.length = 0; nextResult = null; nextError = null; });

  it("opens the suggestion's screen", async () => {
    nextResult = ({ reminder: { id: "rem-1" }, autopilotSlot: { ok: true, recommendation_completed: true, route: "/diary" } });
    mount();
    fireEvent.click(screen.getAllByRole("button")[0]);
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/diary"));
    expect(calls).toEqual(["rem-1"]);
  });

  it("stays where it is for an ordinary reminder", async () => {
    nextResult = ({ reminder: { id: "rem-1" }, autopilotSlot: null });
    mount();
    fireEvent.click(screen.getAllByRole("button")[0]);
    await waitFor(() => expect(calls.length).toBe(1));
    expect(screen.getByTestId("where").textContent).toBe("/home");
  });

  it("a failed complete closes the overlay without navigating", async () => {
    nextError = new Error("gateway 500");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mount();
    fireEvent.click(screen.getAllByRole("button")[0]);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(warn).toHaveBeenCalledWith("[reminder-overlay] complete failed", nextError);
    expect(screen.getByTestId("where").textContent).toBe("/home");
  });
});
