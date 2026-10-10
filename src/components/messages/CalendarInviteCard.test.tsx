/**
 * VTID-04917 — the calendar invite card in a chat.
 *
 * Pins: the person invited gets "I'm in / Maybe / No" and their answer is
 * shown; the sender gets the counts and no buttons; a finished event invites
 * nobody; each answer does what the gateway says (joined / copied →
 * confirmation, paid event or room → its page opens); the bubble renders this
 * card only for cards the gateway built (v2) and keeps the older card for the
 * rest.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { CalendarInviteCard as Invite } from "@/lib/calendar-window-client";

const h = vi.hoisted(() => ({
  state: { my_response: null as string | null, counts: { accepted: 0, maybe: 0, declined: 0 }, is_sender: false },
  respond: vi.fn(),
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
  fmtDate: () => "So., 11. Okt.",
  fmtTime: () => "20:00",
}));
vi.mock("@/lib/calendar-window-client", async () => ({
  ...(await vi.importActual<typeof import("@/lib/calendar-window-client")>("@/lib/calendar-window-client")),
  fetchInviteState: async () => h.state,
  respondToCalendarInvite: h.respond,
}));

import { CalendarInviteCard } from "./CalendarInviteCard";
import { CalendarApiError, isInviteCard } from "@/lib/calendar-window-client";

const FUTURE = new Date(Date.now() + 2 * 86_400_000).toISOString();
const invite = (over: Partial<Invite> = {}): Invite => ({
  kind: "calendar_invite", v: 2, ref_type: "community_event", ref_id: "ev-1",
  title: "Sonnenuntergang am See", start_time: FUTURE, end_time: null, location: "Seepark", ...over,
});

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}

function renderCard(props: { invite?: Invite; isOwnMessage?: boolean } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/messages"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <CalendarInviteCard messageId="msg-1" invite={props.invite ?? invite()} isOwnMessage={props.isOwnMessage ?? false} />
                <Where />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  h.state = { my_response: null, counts: { accepted: 0, maybe: 0, declined: 0 }, is_sender: false };
  h.respond.mockReset();
  h.notify.mockReset();
  h.notifyError.mockReset();
});

describe("CalendarInviteCard (VTID-04917)", () => {
  it("shows the event and offers the three answers to the person invited", async () => {
    renderCard();
    const card = screen.getByTestId("calendar-invite-card");
    expect(card.textContent).toContain("Sonnenuntergang am See");
    expect(card.textContent).toContain("So., 11. Okt. · 20:00");
    expect(card.textContent).toContain("Seepark");
    expect(card.textContent).toContain("vcal.inviteCard.kind.community_event");
    for (const r of ["accepted", "maybe", "declined"]) expect(screen.getByTestId(`calendar-invite-${r}`)).toBeTruthy();
  });

  it("I'm in on a free event: joined, the answer is shown as chosen", async () => {
    h.respond.mockImplementation(async () => {
      h.state = { ...h.state, my_response: "accepted", counts: { accepted: 1, maybe: 0, declined: 0 } };
      return { response: "accepted", action: "joined", path: "/comm/events-meetups?event=ev-1" };
    });
    renderCard();
    fireEvent.click(screen.getByTestId("calendar-invite-accepted"));
    await waitFor(() => expect(h.respond).toHaveBeenCalledWith("msg-1", "accepted"));
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith("vcal.inviteCard.joined"));
    await waitFor(() => expect(screen.getByTestId("calendar-invite-accepted").getAttribute("aria-pressed")).toBe("true"));
    expect(screen.getByTestId("where").textContent).toBe("/messages"); // stays in the chat
  });

  it("a paid event or a room opens its own page", async () => {
    h.respond.mockResolvedValue({ response: "accepted", action: "open_event", path: "/comm/events-meetups?event=ev-1" });
    renderCard();
    fireEvent.click(screen.getByTestId("calendar-invite-accepted"));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/comm/events-meetups?event=ev-1"));
    expect(h.notify).toHaveBeenCalledWith("vcal.inviteCard.openEvent");
  });

  it("an event that stopped happening is named", async () => {
    h.respond.mockRejectedValue(new CalendarApiError("EVENT_NOT_OPEN", 409));
    renderCard();
    fireEvent.click(screen.getByTestId("calendar-invite-accepted"));
    await waitFor(() => expect(h.notifyError).toHaveBeenCalledWith("vcal.inviteCard.notOpen"));
  });

  it("the sender sees the counts and no buttons", async () => {
    h.state = { my_response: null, counts: { accepted: 2, maybe: 1, declined: 0 }, is_sender: true };
    renderCard({ isOwnMessage: true });
    expect((await screen.findByTestId("calendar-invite-counts")).textContent).toContain('vcal.inviteCard.counts:{"yes":2,"maybe":1}');
    expect(screen.queryByTestId("calendar-invite-accepted")).toBeNull();
  });

  it("a finished event invites nobody", () => {
    renderCard({ invite: invite({ start_time: "2026-01-01T10:00:00Z" }) });
    expect(screen.getByTestId("calendar-invite-over")).toBeTruthy();
    expect(screen.queryByTestId("calendar-invite-accepted")).toBeNull();
  });

  it("only gateway-built (v2) cards use this card", () => {
    expect(isInviteCard(invite())).toBe(true);
    expect(isInviteCard({ title: "old", date: "2026-10-11", time: "18:00" })).toBe(false);
    expect(isInviteCard({ ...invite(), v: 1 })).toBe(false);
    expect(isInviteCard({ ...invite(), ref_type: "health_plan" })).toBe(false);
    expect(isInviteCard(null)).toBe(false);
  });
});
