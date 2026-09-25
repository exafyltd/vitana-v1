/**
 * VTID-04536 — the calendar's folding sections and its "+" sheet.
 *
 * Pins: each closed header says what is inside; the connect card offers
 * Google / Apple / Outlook and hands off to Connected Apps with that app;
 * once connected it folds into "Calendars · Google connected"; journey steps
 * open the entry; the "+" sheet saves through the gateway for the active
 * role and refreshes the calendar.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import type { ConnectedAppState } from "@/lib/connected-apps-client";
import type { CalendarWindowItem } from "@/lib/calendar-window-client";

const h = vi.hoisted(() => ({
  fetchConnectedApps: vi.fn(),
  createCalendarEntry: vi.fn(),
  reminders: [] as Array<Record<string, unknown>>,
  journey: null as null | Record<string, unknown>,
  notify: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("@/lib/i18n-toast", async () => ({
  ...(await vi.importActual<typeof import("@/lib/i18n-toast")>("@/lib/i18n-toast")),
  t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  notify: h.notify,
  notifyError: h.notifyError,
}));
vi.mock("@/lib/locale-format", async () => ({
  ...(await vi.importActual<typeof import("@/lib/locale-format")>("@/lib/locale-format")),
  fmtDate: () => "Sat 08:30",
  fmtTime: () => "10:00",
}));
vi.mock("@/hooks/useTranslation", () => ({ useTranslation: () => ({ translate: (_k: string, f: string) => f, isGerman: false }) }));
vi.mock("@/hooks/useReminders", () => ({ useReminders: () => ({ data: h.reminders, isLoading: false }) }));
vi.mock("@/hooks/useJourneyProgress", () => ({ useJourneyProgress: () => h.journey }));
vi.mock("@/components/reminders/RemindersPanel", () => ({ default: () => <div data-testid="reminders-panel" /> }));
vi.mock("@/components/settings/connected-apps/MailCalendarContactsPanel", () => ({ CONNECTED_APPS_QUERY_KEY: ["connected-apps"] }));
vi.mock("@/lib/connected-apps-client", () => ({ fetchConnectedApps: h.fetchConnectedApps }));
vi.mock("@/lib/calendar-window-client", () => ({ createCalendarEntry: h.createCalendarEntry }));

import { CalendarsSection, JourneySection, RemindersSection, connectLink } from "./sections";
import { AddEntrySheet } from "./AddEntrySheet";

function cal(id: "google-calendar" | "apple-calendar" | "outlook-calendar", over: Partial<ConnectedAppState> = {}): ConnectedAppState {
  return {
    id, kind: "calendar", provider: id.startsWith("google") ? "google" : id.startsWith("apple") ? "apple" : "microsoft",
    method: id.startsWith("apple") ? "app_password" : "oauth", availability: "ready", status: "off",
    account: null, syncs: true, last_sync_at: null, last_result: null, last_error: null, ...over,
  } as ConnectedAppState;
}

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/calendar"]}>
        <Routes>
          <Route path="*" element={<>{ui}<Where /></>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  h.reminders = [];
  h.journey = null;
});

describe("CalendarsSection", () => {
  it("nothing connected: an open card with Google, Apple and Outlook", async () => {
    h.fetchConnectedApps.mockResolvedValue([cal("google-calendar"), cal("apple-calendar"), cal("outlook-calendar")]);
    wrap(<CalendarsSection onShowInApp={() => {}} />);
    expect(await screen.findByTestId("vcal-connect")).toBeInTheDocument();
    for (const p of ["google", "apple", "outlook"]) expect(screen.getByTestId(`vcal-connect-${p}`)).toBeInTheDocument();
    expect(screen.queryByText("vcal.calendars.comingSoon")).toBeNull();
  });

  it("each button hands off to Connected Apps with that app", async () => {
    h.fetchConnectedApps.mockResolvedValue([cal("google-calendar"), cal("apple-calendar"), cal("outlook-calendar")]);
    wrap(<CalendarsSection onShowInApp={() => {}} />);
    fireEvent.click(await screen.findByTestId("vcal-connect-outlook"));
    expect(screen.getByTestId("where").textContent).toBe(connectLink("outlook-calendar"));
    expect(connectLink("google-calendar")).toBe("/connectors?tab=productivity&connect=google-calendar");
  });

  it("says sign-in is being set up when no provider is ready", async () => {
    h.fetchConnectedApps.mockResolvedValue([cal("google-calendar", { availability: "not_configured" }), cal("outlook-calendar", { availability: "not_configured" })]);
    wrap(<CalendarsSection onShowInApp={() => {}} />);
    expect(await screen.findByText("vcal.calendars.comingSoon")).toBeInTheDocument();
  });

  it("connected: folds into a section that names what is connected", async () => {
    h.fetchConnectedApps.mockResolvedValue([cal("google-calendar", { status: "on", account: "ana@x.com" }), cal("outlook-calendar")]);
    wrap(<CalendarsSection onShowInApp={() => {}} />);
    const section = await screen.findByTestId("vcal-section-calendars");
    expect(section.textContent).toContain('vcal.calendars.connectedOne:{"name":"vcal.calendars.providers.google"}');
    expect(screen.queryByTestId("vcal-calendar-google")).toBeNull();
    fireEvent.click(section.querySelector("button")!);
    expect(screen.getByTestId("vcal-calendar-google").textContent).toContain("ana@x.com");
  });

  it("flags a connection that needs renewing", async () => {
    h.fetchConnectedApps.mockResolvedValue([cal("google-calendar", { status: "needs_reconnect" })]);
    wrap(<CalendarsSection onShowInApp={() => {}} />);
    expect((await screen.findByTestId("vcal-section-calendars")).textContent).toContain("vcal.calendars.needsReconnect");
  });

  it("'Show in my calendar app' opens the subscription sheet", async () => {
    const onShow = vi.fn();
    h.fetchConnectedApps.mockResolvedValue([cal("google-calendar")]);
    wrap(<CalendarsSection onShowInApp={onShow} />);
    fireEvent.click(await screen.findByTestId("vcal-subscribe-open"));
    expect(onShow).toHaveBeenCalled();
  });
});

describe("RemindersSection", () => {
  it("summarises upcoming reminders while closed and opens the reminders panel", () => {
    h.reminders = [
      { id: "1", status: "pending", next_fire_at: "2026-10-06T06:30:00Z" },
      { id: "2", status: "pending", next_fire_at: "2026-10-07T06:30:00Z" },
      { id: "3", status: "fired", next_fire_at: "2026-10-01T06:30:00Z" },
    ];
    wrap(<RemindersSection />);
    const s = screen.getByTestId("vcal-section-reminders");
    expect(s.textContent).toContain('vcal.remindersSection.upcoming:{"count":2}');
    expect(screen.queryByTestId("reminders-panel")).toBeNull();
    fireEvent.click(s.querySelector("button")!);
    expect(screen.getByTestId("reminders-panel")).toBeInTheDocument();
  });

  it("remembers that it was opened", () => {
    const { unmount } = wrap(<RemindersSection />);
    fireEvent.click(screen.getByTestId("vcal-section-reminders").querySelector("button")!);
    unmount();
    wrap(<RemindersSection />);
    expect(screen.getByTestId("reminders-panel")).toBeInTheDocument();
  });
});

describe("JourneySection", () => {
  const step = (id: string, title: string): CalendarWindowItem =>
    ({ id, event_id: id, start_time: "2026-10-05T08:00:00Z", end_time: null, busy: false, occurrence_index: null, event: { id, title, event_type: "autopilot" } }) as never;

  it("names the wave and how many steps are open, and opens a step", () => {
    h.journey = { dayNumber: 3, wave: { nameKey: "k", name: "Getting Started" }, waveProgress: 40, totalProgress: 3, isActive: true };
    const onOpen = vi.fn();
    wrap(<JourneySection steps={[step("a", "Respond to your matches"), step("b", "Say hi")]} now={new Date("2026-10-05T07:00:00Z")} onOpenStep={onOpen} />);
    const s = screen.getByTestId("vcal-section-journey");
    expect(s.textContent).toContain('Getting Started · vcal.journey.open:{"count":2}');
    fireEvent.click(s.querySelector("button")!);
    fireEvent.click(screen.getAllByTestId("vcal-journey-step")[0]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
  });

  it("is not shown without a journey and without steps", () => {
    wrap(<JourneySection steps={[]} now={new Date()} onOpenStep={() => {}} />);
    expect(screen.queryByTestId("vcal-section-journey")).toBeNull();
  });
});

describe("AddEntrySheet (+)", () => {
  function fill() {
    fireEvent.change(screen.getByPlaceholderText(/What is it|Was ist es/), { target: { value: "Zumba" } });
    fireEvent.click(screen.getByRole("button", { name: /Create Event|Termin erstellen|Erstellen/ }));
  }

  it("saves through the gateway for the active role and closes", async () => {
    h.createCalendarEntry.mockResolvedValue({ id: "new" });
    const onClose = vi.fn();
    wrap(<AddEntrySheet day={new Date("2026-10-05T10:00:00Z")} role="community" onClose={onClose} />);
    fill();
    await waitFor(() => expect(h.createCalendarEntry).toHaveBeenCalled());
    const [input, role] = h.createCalendarEntry.mock.calls[0];
    expect(role).toBe("community");
    expect(input).toMatchObject({ title: "Zumba", event_type: "personal" });
    expect(Date.parse(input.start_time)).toBeGreaterThan(0);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(h.notify).toHaveBeenCalledWith("vcal.add.created");
  });

  it("keeps the sheet open and says so when saving fails", async () => {
    h.createCalendarEntry.mockRejectedValue(new Error("boom"));
    const onClose = vi.fn();
    wrap(<AddEntrySheet day={new Date()} role={null} onClose={onClose} />);
    fill();
    await waitFor(() => expect(h.notifyError).toHaveBeenCalledWith("vcal.add.error"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

import { GuideCard } from "./GuideCard";
import { Disclosure } from "./Disclosure";

describe("GuideCard", () => {
  const actions = () => ({ onStartStep: vi.fn(), onFindEvent: vi.fn(), onAskVitana: vi.fn(), onShowWeek: vi.fn(), onConnect: vi.fn() });

  it("next journey step: says which one and starts it", () => {
    const a = actions();
    wrap(<GuideCard guidance={{ kind: "nextStep", title: "Respond to your matches", openCount: 3, stepId: "s1" }} actions={a} />);
    expect(screen.getByTestId("vcal-guide").textContent).toContain('vcal.guide.nextStep:{"title":"Respond to your matches"}');
    fireEvent.click(screen.getByText("vcal.guide.start"));
    expect(a.onStartStep).toHaveBeenCalledWith("s1");
  });

  it("free day: find an event or plan with Vitana", () => {
    const a = actions();
    wrap(<GuideCard guidance={{ kind: "freeDay" }} actions={a} />);
    fireEvent.click(screen.getByText("vcal.guide.findEvent"));
    fireEvent.click(screen.getByText("vcal.guide.planWithVitana"));
    expect(a.onFindEvent).toHaveBeenCalled();
    expect(a.onAskVitana).toHaveBeenCalled();
  });

  it("connect: jumps to the calendars section", () => {
    const a = actions();
    wrap(<GuideCard guidance={{ kind: "connect" }} actions={a} />);
    fireEvent.click(screen.getByText("vcal.guide.connectAction"));
    expect(a.onConnect).toHaveBeenCalled();
  });

  it("busy: advice only, no button", () => {
    wrap(<GuideCard guidance={{ kind: "busy", count: 7 }} actions={actions()} />);
    expect(screen.getByTestId("vcal-guide").querySelectorAll("button")).toHaveLength(0);
  });
});

describe("Disclosure", () => {
  it("shows its summary closed, exposes aria-expanded, and remembers being opened", () => {
    const { unmount } = wrap(
      <Disclosure id="t" emoji="🧪" title="Title" summary="3 things">
        <p>inside</p>
      </Disclosure>,
    );
    const btn = screen.getByRole("button", { name: /Title/ });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("3 things")).toBeInTheDocument();
    expect(screen.queryByText("inside")).toBeNull();
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    unmount();
    wrap(
      <Disclosure id="t" emoji="🧪" title="Title" summary="3 things">
        <p>inside</p>
      </Disclosure>,
    );
    expect(screen.getByText("inside")).toBeInTheDocument();
  });
});
