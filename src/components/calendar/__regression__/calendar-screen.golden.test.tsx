/* eslint-disable @typescript-eslint/no-explicit-any -- fixtures build partial calendar rows on purpose */
/**
 * VTID-04459 — app calendar regression suite: what the /calendar screen shows.
 *
 * Renders the real Calendar page, its Day / Week / Month views, entry cards,
 * busy blocks and the full-screen entry, against a fixed "now" and a scripted
 * gateway (no network, nothing written anywhere), in German and in Arabic.
 * Each screen is reduced to its visible text, labels and roles and compared
 * with __golden__/calendar-screen.json, and the interactions members use —
 * switching views, stepping, opening an entry, marking it done, moving it,
 * refused moves — are driven and pinned.
 * An intended change is re-recorded (UPDATE_CALENDAR_GOLDEN=1) and committed.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { assertBerlin, expectGolden } from "./golden";
import { outline } from "./outline";
import { setI18nLocale, t } from "@/lib/i18n-toast";
import type { CalendarWindowItem } from "@/lib/calendar-window-client";

const G = "calendar-screen";

const h = vi.hoisted(() => ({
  fetchCalendarWindow: vi.fn(),
  completeCalendarEntry: vi.fn(),
  moveCalendarEntry: vi.fn(),
  notify: vi.fn(),
  notifyError: vi.fn(),
  activateOrb: vi.fn(),
  role: "community" as string,
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: vi.fn() } } }));
vi.mock("@/components/AppLayout", () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div> }));
vi.mock("@/hooks/useRole", () => ({ useRole: () => ({ currentRole: h.role }) }));
vi.mock("@/lib/orbActivate", () => ({ activateOrb: h.activateOrb }));
vi.mock("@/components/calendar/vcal/SubscribeSheet", () => ({ SubscribeSheet: () => <div data-testid="subscribe-sheet" /> }));
// VTID-04536: the folding sections have their own suite (vcal/sections.test.tsx);
// here they are stand-ins so this golden pins the screen around them.
vi.mock("@/components/calendar/vcal/sections", () => ({
  JourneySection: () => <div data-testid="journey-section" />,
  RemindersSection: () => <div data-testid="reminders-section" />,
  CalendarsSection: () => <div data-testid="calendars-section" />,
  useCalendarApps: () => ({ apps: [], loading: false, connected: true }),
}));
vi.mock("@/lib/i18n-toast", async () => {
  const real = await vi.importActual<typeof import("@/lib/i18n-toast")>("@/lib/i18n-toast");
  return { ...real, notify: h.notify, notifyError: h.notifyError };
});
vi.mock("@/lib/calendar-window-client", async () => {
  const real = await vi.importActual<typeof import("@/lib/calendar-window-client")>("@/lib/calendar-window-client");
  return { ...real, fetchCalendarWindow: h.fetchCalendarWindow, completeCalendarEntry: h.completeCalendarEntry, moveCalendarEntry: h.moveCalendarEntry };
});

import CalendarPage from "@/pages/Calendar";
import { DayView, MonthView, WeekView } from "../vcal/views";
import { EntryScreen } from "../vcal/EntryScreen";
import { BusyCard, DayProgress, EntryCard, NextUpCard } from "../vcal/parts";
import { CalendarApiError } from "@/lib/calendar-window-client";

// Monday 5 Oct 2026, 09:10 in Berlin.
const NOW = new Date("2026-10-05T07:10:00.000Z");

function ev(id: string, over: Record<string, unknown> = {}) {
  return {
    id, user_id: "u1", title: id, description: null, location: null,
    event_type: "personal", source_type: "manual", source_ref_type: null,
    pillar: null, wellness_tags: [], completion_status: null, completed_at: null,
    rrule: null, emoji: null, status: "confirmed", role_context: "community",
    ...over,
  };
}

function it_(id: string, start: string, end: string | null, e: Record<string, unknown> | null, extra: Record<string, unknown> = {}): CalendarWindowItem {
  return {
    id, event_id: id, start_time: start, end_time: end,
    busy: e === null, occurrence_index: null, event: e as any,
    ...(e ? { display_emoji: null, reminders: [{ kind: "before", minutes: 10 }], movable: true } : {}),
    ...extra,
  } as CalendarWindowItem;
}

/** A Monday in the member's life: a done habit, a lab order, a walk, a busy block, a series, work, Google busy. */
const DAY: CalendarWindowItem[] = [
  it_("stretch", "2026-10-05T05:00:00.000Z", "2026-10-05T05:15:00.000Z", ev("Dehnen", { pillar: "exercise", completion_status: "completed", rrule: null }), { display_emoji: "🧘" }),
  it_("lab", "2026-10-05T06:30:00.000Z", null, ev("Blutabnahme", { source_type: "lab_order", location: "Labor Mitte", description: "Nüchtern kommen.\nAusweis mitbringen." }), {
    reminders: [{ kind: "evening_before", hour: 19 }, { kind: "before", minutes: 60 }],
    movable: false,
  }),
  it_("walk", "2026-10-05T09:00:00.000Z", "2026-10-05T09:45:00.000Z", ev("Spaziergang mit Ana", { event_type: "community", source_type: "community_rsvp" })),
  it_("busy-dev", "2026-10-05T11:00:00.000Z", "2026-10-05T12:00:00.000Z", null),
  it_("water::2026-10-05T12:00:00.000Z", "2026-10-05T12:00:00.000Z", "2026-10-05T12:05:00.000Z", ev("Wasser trinken", { event_type: "wellness_nudge", rrule: "FREQ=DAILY" }), { occurrence_index: 4, reminders: [{ kind: "before", minutes: 0 }], movable: false }),
  it_("google-busy", "2026-10-05T15:00:00.000Z", "2026-10-05T16:00:00.000Z", null, { source: "google" }),
];

const WEEK_EXTRA: CalendarWindowItem[] = [
  it_("tue", "2026-10-06T16:00:00.000Z", "2026-10-06T17:00:00.000Z", ev("Yoga", { pillar: "mental" })),
  it_("thu", "2026-10-08T10:00:00.000Z", null, ev("Arzttermin", { source_type: "appointment", event_type: "health" }), { movable: false }),
  it_("sun-late", "2026-10-11T21:30:00.000Z", "2026-10-11T22:00:00.000Z", ev("Schlafroutine", { pillar: "sleep" })),
];
const MONTH_EXTRA: CalendarWindowItem[] = [
  ...Array.from({ length: 5 }, (_, i) => it_(`many-${i}`, `2026-10-14T0${6 + i}:00:00.000Z`, null, ev(`Punkt ${i}`, { event_type: ["workout", "nutrition", "community", "personal", "autopilot"][i] }))),
  it_("prev-month", "2026-09-30T08:00:00.000Z", null, ev("Vormonat")),
  it_("next-month", "2026-11-02T08:00:00.000Z", null, ev("Folgemonat")),
];

function page() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/calendar"]}>
        <CalendarPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function serveByRange() {
  h.fetchCalendarWindow.mockImplementation(async (from: Date, to: Date) => ({
    items: [...DAY, ...WEEK_EXTRA, ...MONTH_EXTRA].filter((i) => Date.parse(i.start_time) >= from.getTime() && Date.parse(i.start_time) < to.getTime()),
    timezone: "Europe/Berlin",
  }));
}

beforeAll(() => assertBerlin());
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  setI18nLocale("de-DE");
  h.role = "community";
  for (const f of [h.fetchCalendarWindow, h.completeCalendarEntry, h.moveCalendarEntry, h.notify, h.notifyError, h.activateOrb]) f.mockReset();
  serveByRange();
  document.documentElement.dir = "ltr";
});
afterEach(() => {
  vi.useRealTimers();
  setI18nLocale("de-DE");
});

describe("building blocks", () => {
  it("entry cards, compact cards, busy blocks, next up, progress", () => {
    const { container } = render(
      <div>
        {DAY.map((i) => <EntryCard key={i.id} item={i} onOpen={() => {}} />)}
        {DAY.map((i) => <EntryCard key={`c-${i.id}`} item={i} onOpen={() => {}} compact />)}
        <BusyCard item={DAY[3]} />
        <NextUpCard item={DAY[2]} now={NOW} onOpen={() => {}} />
        <DayProgress done={1} total={3} />
        <DayProgress done={3} total={3} />
        <DayProgress done={0} total={0} />
      </div>,
    );
    expectGolden(G, "blocks", outline(container));
  });

  it("a busy block shows time only — never a title", () => {
    const { container } = render(<EntryCard item={it_("secret", "2026-10-05T11:00:00.000Z", null, null)} onOpen={() => {}} />);
    expect(container.textContent).not.toContain("secret");
    expect(screen.getByTestId("vcal-busy")).toBeTruthy();
  });
});

describe("views", () => {
  it("day, empty day", () => {
    const open = vi.fn();
    const { container, rerender } = render(<DayView items={DAY} onOpen={open} />);
    expectGolden(G, "view.day", outline(container));
    fireEvent.click(screen.getAllByTestId("vcal-entry")[1]);
    expect(open.mock.calls[0][0].id).toBe("lab");
    rerender(<DayView items={[]} onOpen={open} />);
    expectGolden(G, "view.day.empty", outline(container));
  });

  it("week (Monday first, today marked, free days)", () => {
    const pick = vi.fn();
    const { container } = render(<WeekView anchor={NOW} items={[...DAY, ...WEEK_EXTRA]} now={NOW} onOpen={() => {}} onPickDay={pick} />);
    expectGolden(G, "view.week", outline(container));
    fireEvent.click(within(container.querySelectorAll("section")[3] as HTMLElement).getAllByRole("button")[0]);
    expect(pick.mock.calls[0][0].toISOString()).toBe(new Date(2026, 9, 8).toISOString());
  });

  it("month (6-week grid, 3 emoji then +n, neighbour months)", () => {
    const pick = vi.fn();
    const { container } = render(<MonthView anchor={NOW} items={[...DAY, ...WEEK_EXTRA, ...MONTH_EXTRA]} now={NOW} onPickDay={pick} />);
    expect(screen.getAllByTestId("vcal-month-day")).toHaveLength(42);
    expectGolden(G, "view.month", outline(container));
  });
});

describe("entry screen", () => {
  const screens: Record<string, CalendarWindowItem> = {
    walk_future_movable: DAY[2],
    lab_with_location_and_description: DAY[1],
    done_habit: DAY[0],
    series_occurrence: DAY[4],
    work_item: it_("work:deploy_prod:1", "2026-10-05T10:00:00.000Z", "2026-10-05T10:15:00.000Z", ev("gateway abc1234", { event_type: "deployment", emoji: "🚀" }), {
      work: { kind: "deploy_prod", source_id: "1", params: {} },
      reminders: [],
      movable: false,
    }),
  };

  it.each(Object.keys(screens))("%s", (name) => {
    const { container } = render(<EntryScreen item={screens[name]} now={NOW} onClose={() => {}} onComplete={() => {}} onMove={() => {}} />);
    expectGolden(G, `entry.${name}`, outline(container));
  });

  it("move picker keeps the entry and only confirms a new time; Escape closes", () => {
    const onMove = vi.fn();
    const onClose = vi.fn();
    render(<EntryScreen item={DAY[2]} now={NOW} onClose={onClose} onComplete={() => {}} onMove={onMove} />);
    fireEvent.click(screen.getByTestId("vcal-move"));
    const confirm = screen.getByTestId("vcal-move-confirm") as HTMLButtonElement;
    expect(confirm.disabled).toBe(true); // unchanged time
    fireEvent.change(screen.getByLabelText(/./, { selector: "input" }), { target: { value: "2026-10-06T08:15" } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    expect(onMove.mock.calls[0][1].toISOString()).toBe("2026-10-06T06:15:00.000Z");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("the /calendar page", () => {
  it("opens on today's day view with greeting, progress and next up", async () => {
    const { container } = page();
    await screen.findByTestId("vcal-day");
    await screen.findByTestId("vcal-next-up");
    expectGolden(G, "page.day", outline(container));
    // Day view asks for today and the whole local day.
    const ranges = h.fetchCalendarWindow.mock.calls.map((c) => [c[0].toISOString(), c[1].toISOString(), c[2]]);
    expectGolden(G, "page.day.requests", ranges);
  });

  it("switching to week and month is remembered; picking a day returns to the day view", async () => {
    const { container, unmount } = page();
    await screen.findByTestId("vcal-day");
    fireEvent.click(screen.getAllByRole("tab")[1]);
    await screen.findByTestId("vcal-week");
    expectGolden(G, "page.week", outline(container));
    fireEvent.click(screen.getAllByRole("tab")[2]);
    await screen.findByTestId("vcal-month");
    expectGolden(G, "page.month.header", outline(container.querySelector("h1")!.parentElement!));
    unmount();
    page();
    await screen.findByTestId("vcal-month"); // remembered
    fireEvent.click(screen.getAllByTestId("vcal-month-day")[8]); // Tue 6 Oct (grid starts Mon 28 Sep)
    await screen.findByText("Yoga");
    expect(screen.getByTestId("vcal-day")).toBeTruthy();
    expect(screen.getAllByRole("tab")[0].getAttribute("aria-selected")).toBe("true");
  });

  it("‹ › and 'Heute' step through days", async () => {
    const { container } = page();
    await screen.findByTestId("vcal-day");
    const header = () => container.querySelector("h1")!.textContent!;
    const headers = [header()];
    fireEvent.click(screen.getByRole("button", { name: t("vcal.next") }));
    fireEvent.click(screen.getByRole("button", { name: t("vcal.next") }));
    await waitFor(() => expect(header()).not.toBe(headers[0]));
    headers.push(header());
    fireEvent.click(screen.getByRole("button", { name: t("vcal.prev") }));
    headers.push(header());
    fireEvent.click(screen.getByRole("button", { name: t("vcal.today") }));
    await waitFor(() => expect(header()).toBe(headers[0]));
    expect(screen.queryByRole("button", { name: t("vcal.today") })).toBeNull();
    expectGolden(G, "page.step", headers);
  });

  it("mark done: calls the gateway, confirms, closes, reloads", async () => {
    h.completeCalendarEntry.mockResolvedValue(undefined);
    page();
    fireEvent.click((await screen.findAllByTestId("vcal-entry"))[2]); // the walk
    fireEvent.click(await screen.findByTestId("vcal-complete"));
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith("vcal.doneToast"));
    expect(h.completeCalendarEntry).toHaveBeenCalledWith("walk", "community");
    await waitFor(() => expect(screen.queryByTestId("vcal-entry-screen")).toBeNull());
  });

  it("move: refused moves name their reason; other failures a generic error", async () => {
    const reasons: Record<string, unknown> = {};
    for (const [name, err] of [
      ["owned_by_source", new CalendarApiError("NOT_MOVABLE", 409, { reason: "owned_by_source" })],
      ["recurring", new CalendarApiError("NOT_MOVABLE", 409, { reason: "recurring" })],
      ["network", new Error("offline")],
    ] as const) {
      h.moveCalendarEntry.mockReset().mockRejectedValue(err);
      h.notifyError.mockReset();
      const { unmount } = page();
      fireEvent.click((await screen.findAllByTestId("vcal-entry"))[2]);
      fireEvent.click(await screen.findByTestId("vcal-move"));
      fireEvent.change(screen.getByLabelText(/./, { selector: "input" }), { target: { value: "2026-10-06T08:15" } });
      fireEvent.click(screen.getByTestId("vcal-move-confirm"));
      await waitFor(() => expect(h.notifyError).toHaveBeenCalled());
      reasons[name] = h.notifyError.mock.calls[0][0];
      unmount();
    }
    expectGolden(G, "page.moveErrors", reasons);
  });

  it("errors show a retry; the voice button opens Vitana", async () => {
    h.fetchCalendarWindow.mockRejectedValue(new Error("down"));
    const { container } = page();
    await screen.findByRole("alert");
    expectGolden(G, "page.error", outline(screen.getByRole("alert")));
    fireEvent.click(screen.getByTestId("vcal-voice-add"));
    expect(h.activateOrb).toHaveBeenCalled();
    expect(container.querySelector("[data-testid=vcal-entry]")).toBeNull();
  });

  it("developer role passes through to the gateway", async () => {
    h.role = "developer";
    page();
    await screen.findByTestId("vcal-day");
    expect(h.fetchCalendarWindow.mock.calls.every((c) => c[2] === "developer")).toBe(true);
  });

  it("Arabic, right-to-left", async () => {
    await act(async () => {
      await (await import("@/i18n")).ensureCatalog("ar-XA");
    });
    setI18nLocale("ar-XA");
    document.documentElement.dir = "rtl";
    const { container } = page();
    await screen.findByTestId("vcal-next-up");
    expectGolden(G, "page.day.ar", outline(container));
  });
});
