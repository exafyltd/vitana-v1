/**
 * VTID-05126 — share any of my upcoming calendar entries (feed + chat).
 *
 * Pins:
 *   - the share panel for an own entry (a reminder, a health entry, …): the
 *     card title is editable (prefilled, the prefilled line follows it until
 *     the member writes their own), the place is hidden by default, the
 *     preview shows exactly the card, a health entry carries a hint, and the
 *     payload carries card_title / include_location;
 *   - an event share stays as it was (no card fields, live card hint);
 *   - a shared own entry renders from the snapshot on the post (no fetch):
 *     title, time, place only if shown, state; "In meinen Kalender" for other
 *     members only, never for the author or a cancelled / finished entry;
 *   - attachedRefOf accepts calendar_entry only with a valid snapshot;
 *   - right-to-left render works.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { CalendarEntry, CalendarWindowItem, ShareToFeedInput } from "@/lib/calendar-window-client";
import type { PostAttachedRef } from "@/lib/post-attachment";

const h = vi.hoisted(() => ({
  add: vi.fn(),
  fetchAttached: vi.fn(),
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
  fmtDate: () => "Mi., 4. Nov.",
  fmtTime: () => "01:00",
}));
vi.mock("@/lib/calendar-window-client", async () => ({
  ...(await vi.importActual<typeof import("@/lib/calendar-window-client")>("@/lib/calendar-window-client")),
  addSharedEntryToCalendar: h.add,
}));
vi.mock("@/lib/post-attachment", async () => {
  const actual = await vi.importActual<typeof import("@/lib/post-attachment")>("@/lib/post-attachment");
  return { ...actual, fetchAttachedEvent: h.fetchAttached };
});

import { ShareToFeedPanel } from "./ShareToFeedPanel";
import { EventAttachmentCard } from "@/components/feed/EventAttachmentCard";
import { attachedRefOf } from "@/lib/post-attachment";
import { CalendarApiError } from "@/lib/calendar-window-client";

const FUTURE = new Date(Date.now() + 22 * 86_400_000).toISOString();
const FUTURE_END = new Date(Date.now() + 22 * 86_400_000 + 15 * 60_000).toISOString();
const PAST = new Date(Date.now() - 86_400_000).toISOString();
const ENTRY_ID = "3f1c2a54-8a51-4c8e-9e0a-0d6b6a1f2c11";

function item(over: Partial<CalendarEntry> = {}, itemOver: Partial<CalendarWindowItem> = {}): CalendarWindowItem {
  const event: CalendarEntry = {
    id: ENTRY_ID, title: "Erinnerung: Geburtstag von Maria Maksina", description: null, start_time: FUTURE, end_time: FUTURE_END,
    location: "Bei Maria, Hauptstr. 5", event_type: "personal", status: "confirmed", source_type: "reminder", source_ref_type: "reminder",
    source_ref_id: "rem-1", role_context: "community", completion_status: null, completed_at: null, wellness_tags: null, pillar: null,
    rrule: null, emoji: "🎂", attendees_count: null, metadata: null, ...over,
  };
  return { id: ENTRY_ID, event_id: ENTRY_ID, start_time: FUTURE, end_time: FUTURE_END, busy: false, occurrence_index: null, shareable: true, invitable: true, event, ...itemOver };
}

function panel(it: CalendarWindowItem, onShare = vi.fn()) {
  render(<ShareToFeedPanel item={it} accent="#6b2bd9" bg="#ffffff" ink="#0f172a" onCancel={() => {}} onShare={onShare} />);
  return onShare;
}

beforeEach(() => {
  h.add.mockReset().mockResolvedValue("added");
  h.fetchAttached.mockReset();
  h.notify.mockReset();
  h.notifyError.mockReset();
});

describe("sharing an own entry (VTID-05126)", () => {
  it("the card title is editable; the prefilled line follows it; the place stays hidden by default", () => {
    const onShare = panel(item());
    const title = screen.getByTestId("vcal-share-card-title") as HTMLInputElement;
    expect(title.value).toBe("Erinnerung: Geburtstag von Maria Maksina");
    fireEvent.change(title, { target: { value: "Marias Geburtstag" } });
    expect((screen.getByTestId("vcal-share-text") as HTMLTextAreaElement).value).toBe(
      'vcal.share.defaultTextOwn:{"title":"Marias Geburtstag","date":"Mi., 4. Nov."}',
    );
    expect(screen.getByTestId("vcal-share-calendar-title").textContent).toContain("Erinnerung: Geburtstag von Maria Maksina");
    const preview = screen.getByTestId("vcal-share-preview").textContent ?? "";
    expect(preview).toContain("Marias Geburtstag");
    expect(preview).not.toContain("Hauptstr");
    expect((screen.getByTestId("vcal-share-location") as HTMLInputElement).checked).toBe(false);

    fireEvent.click(screen.getByTestId("vcal-share-post"));
    const input = onShare.mock.calls[0][0] as ShareToFeedInput;
    expect(input).toEqual({
      text: 'vcal.share.defaultTextOwn:{"title":"Marias Geburtstag","date":"Mi., 4. Nov."}',
      is_public: true,
      card_title: "Marias Geburtstag",
      include_location: false,
    });
  });

  it("the member's own words are kept when the title changes afterwards; showing the place puts it on the card", () => {
    const onShare = panel(item());
    fireEvent.change(screen.getByTestId("vcal-share-text"), { target: { value: "Wer kommt mit?" } });
    fireEvent.change(screen.getByTestId("vcal-share-card-title"), { target: { value: "Marias Party" } });
    expect((screen.getByTestId("vcal-share-text") as HTMLTextAreaElement).value).toBe("Wer kommt mit?");
    fireEvent.click(screen.getByTestId("vcal-share-location"));
    expect(screen.getByTestId("vcal-share-preview").textContent).toContain("Bei Maria, Hauptstr. 5");
    fireEvent.click(screen.getByTestId("vcal-share-public"));
    fireEvent.click(screen.getByTestId("vcal-share-post"));
    expect(onShare.mock.calls[0][0]).toEqual({ text: "Wer kommt mit?", is_public: false, card_title: "Marias Party", include_location: true });
  });

  it("a health entry carries the hint and starts with no prefilled line; nothing is blocked", () => {
    panel(item({ source_type: "appointment", title: "Kardiologie Dr. Weber" }, { sensitive: true }));
    expect(screen.getByTestId("vcal-share-sensitive").textContent).toBe("vcal.share.sensitiveHint");
    expect((screen.getByTestId("vcal-share-text") as HTMLTextAreaElement).value).toBe("");
    fireEvent.change(screen.getByTestId("vcal-share-card-title"), { target: { value: "Arzttermin" } });
    expect((screen.getByTestId("vcal-share-text") as HTMLTextAreaElement).value).toBe("");
    expect((screen.getByTestId("vcal-share-post") as HTMLButtonElement).disabled).toBe(false);
  });

  it("no place on the entry → no place switch", () => {
    panel(item({ location: null }));
    expect(screen.queryByTestId("vcal-share-location")).toBeNull();
  });

  it("an event share is unchanged: no card fields, the live-card hint", () => {
    const onShare = panel(item({ source_type: "community_rsvp", source_ref_type: "community_event", source_ref_id: ENTRY_ID, title: "Sunset walk" }));
    expect(screen.queryByTestId("vcal-share-card-title")).toBeNull();
    expect(screen.queryByTestId("vcal-share-preview")).toBeNull();
    expect(screen.getByText("vcal.share.cardHint")).toBeTruthy();
    fireEvent.click(screen.getByTestId("vcal-share-post"));
    expect(Object.keys(onShare.mock.calls[0][0]).sort()).toEqual(["is_public", "text"]);
  });

  it("renders right-to-left", () => {
    document.documentElement.dir = "rtl";
    panel(item());
    expect(screen.getByTestId("vcal-share-panel")).toBeTruthy();
    document.documentElement.dir = "ltr";
  });
});

describe("a shared own entry in the feed (VTID-05126)", () => {
  const POST = "9b9b9b9b-8a51-4c8e-9e0a-0d6b6a1f2c11";
  const ref = (over: Record<string, unknown> = {}): PostAttachedRef =>
    attachedRefOf({
      attached_ref_type: "calendar_entry",
      attached_ref_id: ENTRY_ID,
      attached_snapshot: { title: "Marias Geburtstag", start_time: FUTURE, end_time: FUTURE_END, location: null, emoji: "🎂", status: "confirmed", ...over },
    })!;

  function card(attached: PostAttachedRef, isOwnPost = false) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <EventAttachmentCard attached={attached} postId={POST} isOwnPost={isOwnPost} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("attachedRefOf: calendar_entry only with a valid snapshot", () => {
    expect(ref()).toMatchObject({ type: "calendar_entry", id: ENTRY_ID, snapshot: { title: "Marias Geburtstag", location: null } });
    expect(attachedRefOf({ attached_ref_type: "calendar_entry", attached_ref_id: ENTRY_ID, attached_snapshot: null })).toBeNull();
    expect(attachedRefOf({ attached_ref_type: "calendar_entry", attached_ref_id: ENTRY_ID, attached_snapshot: { title: "x" } })).toBeNull();
  });

  it("renders from the card on the post — no fetch — and offers 'In meinen Kalender' to others", async () => {
    card(ref());
    const el = screen.getByTestId("feed-event-card");
    expect(el.textContent).toContain("Marias Geburtstag");
    expect(el.getAttribute("data-state")).toBe("upcoming");
    expect(h.fetchAttached).not.toHaveBeenCalled();
    expect(screen.queryByTestId("feed-event-card-open")).toBeNull();
    fireEvent.click(screen.getByTestId("feed-event-card-add"));
    await waitFor(() => expect(h.add).toHaveBeenCalledWith(POST));
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith("vcal.feedCard.added"));
  });

  it("a second tap says it is already there; a cancelled-meanwhile entry is named", async () => {
    h.add.mockResolvedValueOnce("already");
    card(ref());
    fireEvent.click(screen.getByTestId("feed-event-card-add"));
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith("vcal.feedCard.alreadyAdded"));
    h.add.mockRejectedValueOnce(new CalendarApiError("NOT_OPEN", 409));
    fireEvent.click(screen.getByTestId("feed-event-card-add"));
    await waitFor(() => expect(h.notifyError).toHaveBeenCalledWith("vcal.feedCard.notOpen"));
  });

  it("no button for the author, for a cancelled entry, or for one that is over", () => {
    card(ref(), true);
    expect(screen.queryByTestId("feed-event-card-add")).toBeNull();
  });

  it("a cancelled or finished entry says so and invites nobody", () => {
    card(ref({ status: "cancelled" }));
    expect(screen.getByTestId("feed-event-card").getAttribute("data-state")).toBe("cancelled");
    expect(screen.queryByTestId("feed-event-card-add")).toBeNull();
  });

  it("a finished entry is past", () => {
    card(ref({ start_time: PAST, end_time: PAST }));
    expect(screen.getByTestId("feed-event-card").getAttribute("data-state")).toBe("past");
    expect(screen.queryByTestId("feed-event-card-add")).toBeNull();
  });

  it("the place shows only when the author chose to show it", () => {
    card(ref({ location: "Bei Maria" }));
    expect(screen.getByTestId("feed-event-card").textContent).toContain("Bei Maria");
  });
});
