/**
 * VTID-04916 — sharing a calendar entry to the news feed.
 *
 * Pins: the entry screen offers "share" only when the gateway says the entry
 * is shareable and it has not been shared yet; the panel is prefilled with a
 * line naming the event and its day, public by default, can be switched to
 * profile-only, and hands exactly the text and visibility to onShare; once
 * shared, the entry links to the post instead. The client posts to the
 * share route and turns refusals into the reason the member sees.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { CalendarEntry, CalendarWindowItem } from "@/lib/calendar-window-client";

vi.mock("@/lib/i18n-toast", async () => ({
  ...(await vi.importActual<typeof import("@/lib/i18n-toast")>("@/lib/i18n-toast")),
  t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
}));
vi.mock("@/lib/locale-format", async () => ({
  ...(await vi.importActual<typeof import("@/lib/locale-format")>("@/lib/locale-format")),
  fmtDate: () => "Samstag, 10. Oktober",
}));
vi.mock("@/lib/orbActivate", () => ({ activateOrb: vi.fn(), activateOrbGuide: vi.fn() }));
vi.mock("@/lib/cached-access-token", () => ({ getAccessToken: async () => "tok" }));

import { EntryScreen } from "./EntryScreen";
import { ShareToFeedPanel, defaultShareText } from "./ShareToFeedPanel";
import { CalendarApiError, shareCalendarEntryToFeed, shareFailureOf } from "@/lib/calendar-window-client";

const NOW = new Date("2026-10-08T10:00:00Z");
const EVENT_ID = "3f1c2a54-8a51-4c8e-9e0a-0d6b6a1f2c11";

function item(itemOver: Partial<CalendarWindowItem> = {}, over: Partial<CalendarEntry> = {}): CalendarWindowItem {
  const event: CalendarEntry = {
    id: "e1", title: "Sonnenuntergang-Spaziergang", description: null, start_time: "2026-10-10T16:00:00Z",
    end_time: "2026-10-10T17:00:00Z", location: null, event_type: "community", status: "confirmed",
    source_type: "community_rsvp", source_ref_type: "community_event", source_ref_id: EVENT_ID,
    role_context: "community", completion_status: null, completed_at: null, wellness_tags: null, pillar: null,
    rrule: null, emoji: null, attendees_count: null, metadata: null, ...over,
  };
  return {
    id: "e1", event_id: "e1", start_time: event.start_time, end_time: event.end_time, busy: false,
    occurrence_index: null, event, shareable: true, shared_post_id: null, ...itemOver,
  };
}

describe("share from the entry screen (VTID-04916)", () => {
  it("offers sharing for a shareable entry and posts the edited text", () => {
    const onShare = vi.fn();
    render(<EntryScreen item={item()} now={NOW} onClose={() => {}} onShare={onShare} onOpenSource={() => {}} />);
    expect(screen.queryByTestId("vcal-share-panel")).toBeNull();
    fireEvent.click(screen.getByTestId("vcal-share"));

    const text = screen.getByTestId("vcal-share-text") as HTMLTextAreaElement;
    expect(text.value).toBe(
      'vcal.share.defaultText:{"title":"Sonnenuntergang-Spaziergang","date":"Samstag, 10. Oktober"}',
    );
    expect((screen.getByTestId("vcal-share-public") as HTMLInputElement).checked).toBe(true);

    fireEvent.change(text, { target: { value: "  Kommt mit!  " } });
    fireEvent.click(screen.getByTestId("vcal-share-public"));
    expect(screen.getByText("vcal.share.profileOnly")).toBeTruthy();
    fireEvent.click(screen.getByTestId("vcal-share-post"));
    expect(onShare).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }), { text: "Kommt mit!", is_public: false });
  });

  it("cancel closes the panel without sharing", () => {
    const onShare = vi.fn();
    render(<EntryScreen item={item()} now={NOW} onClose={() => {}} onShare={onShare} />);
    fireEvent.click(screen.getByTestId("vcal-share"));
    fireEvent.click(screen.getByText("vcal.share.cancel"));
    expect(screen.queryByTestId("vcal-share-panel")).toBeNull();
    expect(onShare).not.toHaveBeenCalled();
  });

  it("is not offered when the gateway says no, for busy or work items, or without a handler", () => {
    const cases: CalendarWindowItem[] = [
      item({ shareable: false }),
      item({ shareable: undefined }),
      item({ busy: true }),
    ];
    for (const c of cases) {
      const { unmount } = render(<EntryScreen item={c} now={NOW} onClose={() => {}} onShare={() => {}} />);
      expect(screen.queryByTestId("vcal-share")).toBeNull();
      unmount();
    }
    render(<EntryScreen item={item()} now={NOW} onClose={() => {}} />);
    expect(screen.queryByTestId("vcal-share")).toBeNull();
  });

  it("once shared, links to the post instead", () => {
    const onOpenSource = vi.fn();
    render(<EntryScreen item={item({ shared_post_id: "p-77" })} now={NOW} onClose={() => {}} onShare={() => {}} onOpenSource={onOpenSource} />);
    expect(screen.queryByTestId("vcal-share")).toBeNull();
    fireEvent.click(screen.getByTestId("vcal-shared-post"));
    expect(onOpenSource).toHaveBeenCalledWith("/post/post/p-77");
  });

  it("the post button waits while sharing", () => {
    render(<ShareToFeedPanel item={item()} accent="#000" bg="#fff" ink="#111" sharing onCancel={() => {}} onShare={() => {}} />);
    expect((screen.getByTestId("vcal-share-post") as HTMLButtonElement).disabled).toBe(true);
  });

  it("the default text names the event and its day", () => {
    expect(defaultShareText(item())).toContain("Sonnenuntergang-Spaziergang");
  });
});

describe("share client (VTID-04916)", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts text and visibility for the entry and returns the post id", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { post_id: "p-1" } }), { status: 200 }));
    await expect(shareCalendarEntryToFeed("e1", { text: "Hi", is_public: true }, "community")).resolves.toBe("p-1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/v1\/calendar\/events\/e1\/share-to-feed$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ text: "Hi", is_public: true });
    expect(init.headers["X-Vitana-Active-Role"]).toBe("community");
  });

  it("names why a share was refused", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: false, error: "ALREADY_SHARED", post_id: "p-9" }), { status: 409 }));
    const err = await shareCalendarEntryToFeed("e1", { text: "", is_public: true }, null).catch((e) => e);
    expect(shareFailureOf(err)).toEqual({ kind: "already_shared", postId: "p-9" });

    const of = (error: string) => shareFailureOf(new CalendarApiError(error, 409, { error }));
    expect(of("NOT_SHAREABLE").kind).toBe("not_shareable");
    expect(of("SHARE_LIMIT").kind).toBe("limit");
    expect(of("RATE_LIMITED").kind).toBe("limit");
    expect(of("DUPLICATE_POST").kind).toBe("duplicate");
    expect(of("USER_SUSPENDED").kind).toBe("suspended");
    expect(of("INSERT_FAILED").kind).toBe("error");
    expect(shareFailureOf(new Error("boom")).kind).toBe("error");
  });
});
