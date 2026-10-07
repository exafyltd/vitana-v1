/**
 * VTID-04916 — the live event card under a shared post.
 *
 * Pins: an upcoming event offers to open it (joining and tickets happen
 * there), a live room offers "join now", a cancelled or finished event says
 * so and invites nobody, a gone event says it is unavailable, and the button
 * never triggers the post card's own navigation.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { AttachedEvent, PostAttachedRef } from "@/lib/post-attachment";

const h = vi.hoisted(() => ({ ev: null as AttachedEvent | null }));

vi.mock("@/lib/i18n-toast", async () => ({
  ...(await vi.importActual<typeof import("@/lib/i18n-toast")>("@/lib/i18n-toast")),
  t: (key: string) => key,
}));
vi.mock("@/lib/locale-format", async () => ({
  ...(await vi.importActual<typeof import("@/lib/locale-format")>("@/lib/locale-format")),
  fmtDate: () => "Sa. 10. Okt.",
  fmtTime: () => "18:00",
}));
vi.mock("@/lib/post-attachment", async () => ({
  ...(await vi.importActual<typeof import("@/lib/post-attachment")>("@/lib/post-attachment")),
  fetchAttachedEvent: async () => h.ev,
}));

import { EventAttachmentCard } from "./EventAttachmentCard";

const EVENT: PostAttachedRef = { type: "community_event", id: "3f1c2a54-8a51-4c8e-9e0a-0d6b6a1f2c11" };
const ROOM: PostAttachedRef = { type: "live_room_session", id: "3f1c2a54-8a51-4c8e-9e0a-0d6b6a1f2c12" };

function Where() {
  return <div data-testid="where">{useLocation().pathname + useLocation().search}</div>;
}

function renderCard(attached: PostAttachedRef, onCardClick = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/home"]}>
        <Routes>
          <Route
            path="*"
            element={
              <div onClick={onCardClick}>
                <EventAttachmentCard attached={attached} />
                <Where />
              </div>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return onCardClick;
}

function ev(over: Partial<AttachedEvent>): AttachedEvent {
  return { title: "Sonnenuntergang-Spaziergang", start_time: "2026-10-10T16:00:00Z", end_time: null, location: "Spree-Ufer", state: "upcoming", path: `/comm/events-meetups?event=${EVENT.id}`, ...over };
}

describe("EventAttachmentCard (VTID-04916)", () => {
  beforeEach(() => {
    h.ev = null;
  });

  it("an upcoming event opens the event, without opening the post's own target", async () => {
    h.ev = ev({});
    const onCardClick = renderCard(EVENT);
    const card = await screen.findByTestId("feed-event-card");
    expect(card.getAttribute("data-state")).toBe("upcoming");
    expect(card.textContent).toContain("Sonnenuntergang-Spaziergang");
    expect(card.textContent).toContain("Sa. 10. Okt. · 18:00 · Spree-Ufer");
    expect(card.textContent).toContain("vcal.feedCard.upcoming");
    fireEvent.click(screen.getByTestId("feed-event-card-open"));
    expect(screen.getByText("vcal.feedCard.openEvent")).toBeTruthy();
    expect(screen.getByTestId("where").textContent).toBe(`/comm/events-meetups?event=${EVENT.id}`);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it("a live room offers to join now; an upcoming one to view the room", async () => {
    h.ev = ev({ state: "live", location: null, path: "/comm/live-rooms/r1/view" });
    renderCard(ROOM);
    expect((await screen.findByTestId("feed-event-card-open")).textContent).toBe("vcal.feedCard.joinRoom");
  });

  it("an upcoming room offers to view it", async () => {
    h.ev = ev({ state: "upcoming", location: null, path: "/comm/live-rooms/r1/view" });
    renderCard(ROOM);
    expect((await screen.findByTestId("feed-event-card-open")).textContent).toBe("vcal.feedCard.openRoom");
  });

  it.each(["cancelled", "past"] as const)("a %s event says so and invites nobody", async (state) => {
    h.ev = ev({ state });
    renderCard(EVENT);
    const card = await screen.findByTestId("feed-event-card");
    expect(card.textContent).toContain(`vcal.feedCard.${state}`);
    expect(screen.queryByTestId("feed-event-card-open")).toBeNull();
  });

  it("a gone event says it is unavailable", async () => {
    renderCard(EVENT);
    expect((await screen.findByTestId("feed-event-card-gone")).textContent).toBe("vcal.feedCard.unavailable");
  });
});
