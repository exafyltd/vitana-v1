/**
 * VTID-04917 — inviting someone to a calendar entry.
 *
 * Pins: the entry screen offers Invite for a shareable event/room or the
 * member's own one-off entry and never for a series, a finished or done
 * entry or anything a source owns; the audiobook entry opens the player and
 * has no "mark done"; the picker lists real direct chats (never the Vitana
 * bot or a legacy thread) and groups, sends nothing until one is picked,
 * sends only { entry_id } (the gateway builds the card), and names a
 * refusal.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CalendarEntry, CalendarWindowItem } from "@/lib/calendar-window-client";

const h = vi.hoisted(() => ({
  sendChatMessage: vi.fn(),
  sendGroupMessage: vi.fn(),
  threads: [] as unknown[],
  groups: [] as unknown[],
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
  fmtDate: () => "Sa, 10. Okt.",
}));
vi.mock("@/lib/orbActivate", () => ({ activateOrb: vi.fn(), activateOrbGuide: vi.fn() }));
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
vi.mock("@/hooks/useChatApi", () => ({
  fetchGroups: async () => h.groups,
  sendChatMessage: h.sendChatMessage,
  sendGroupMessage: h.sendGroupMessage,
}));
vi.mock("@/hooks/useGlobalMessages", () => ({ buildGlobalThreadsQueryFn: async () => h.threads }));
vi.mock("./useOverlap", () => ({ useOverlap: () => [] }));

import { InviteToChatSheet, dmTargets } from "./InviteToChatSheet";
import { EntryScreen } from "./EntryScreen";
import { canInviteEntry, isAudiobookEntry } from "./entry-actions";
import { entryTitle, sourceLabel } from "./labels";

const NOW = new Date("2026-10-10T10:00:00Z");
const BOT = "00000000-0000-0000-0000-000000000001";

function item(over: Partial<CalendarEntry> = {}, itemOver: Partial<CalendarWindowItem> = {}): CalendarWindowItem {
  const event: CalendarEntry = {
    id: "e1", title: "Kaffee bei Luigi", description: null, start_time: "2026-10-12T15:00:00Z", end_time: "2026-10-12T16:00:00Z",
    location: null, event_type: "personal", status: "confirmed", source_type: "manual", source_ref_type: null, source_ref_id: null,
    role_context: "community", completion_status: null, completed_at: null, wellness_tags: null, pillar: null,
    rrule: null, emoji: null, attendees_count: null, metadata: null, ...over,
  };
  return { id: "e1", event_id: "e1", start_time: event.start_time, end_time: event.end_time, busy: false, occurrence_index: null, event, ...itemOver };
}

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  h.sendChatMessage.mockReset().mockResolvedValue({ id: "m1" });
  h.sendGroupMessage.mockReset().mockResolvedValue({ id: "m2" });
  h.notify.mockReset();
  h.notifyError.mockReset();
  h.threads = [
    { id: "peer-1", type: "direct", participants: [{ user_id: "me", display_name: "Me" }, { user_id: "peer-1", display_name: "Ana" }] },
    { id: BOT, type: "direct", participants: [{ user_id: BOT, display_name: "Vitana" }] },
    { id: "legacy-thread", type: "direct", participants: [{ user_id: "x", display_name: "Old" }] },
    { id: "legacy-group", type: "group", name: "Legacy", participants: [] },
  ];
  h.groups = [{ id: "g-1", name: "Laufgruppe" }];
});

describe("who can be invited to what (VTID-04917)", () => {
  it("a shareable event or room, or the member's own one-off entry", () => {
    expect(canInviteEntry(item(), NOW)).toBe(true);
    expect(canInviteEntry(item({ source_type: "invite" }), NOW)).toBe(true);
    expect(canInviteEntry(item({ source_type: "community_rsvp" }, { shareable: true }), NOW)).toBe(true);
  });

  it("never a series, a finished, done or cancelled entry, a busy block or a source-owned entry", () => {
    expect(canInviteEntry(item({ rrule: "FREQ=WEEKLY" }), NOW)).toBe(false);
    expect(canInviteEntry(item({}, { occurrence_index: 2 }), NOW)).toBe(false);
    expect(canInviteEntry(item({ start_time: "2026-10-09T08:00:00Z" }, { start_time: "2026-10-09T08:00:00Z", end_time: "2026-10-09T09:00:00Z" }), NOW)).toBe(false);
    expect(canInviteEntry(item({ completion_status: "completed", completed_at: "2026-10-10T09:00:00Z" }), NOW)).toBe(false);
    expect(canInviteEntry(item({ status: "cancelled" }), NOW)).toBe(false);
    expect(canInviteEntry(item({}, { busy: true }), NOW)).toBe(false);
    for (const source_type of ["health_plan", "lab_order", "appointment", "autopilot", "assistant", "audiobook", "community_rsvp"]) {
      expect(canInviteEntry(item({ source_type }), NOW)).toBe(false);
    }
  });

  it("the entry screen offers Invite only with a handler and hands the entry over", () => {
    const onInvite = vi.fn();
    const { unmount } = render(<EntryScreen item={item()} now={NOW} onClose={() => {}} onInvite={onInvite} />);
    fireEvent.click(screen.getByTestId("vcal-invite"));
    expect(onInvite).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }));
    unmount();
    render(<EntryScreen item={item()} now={NOW} onClose={() => {}} />);
    expect(screen.queryByTestId("vcal-invite")).toBeNull();
  });
});

describe("the audiobook entry (VTID-04917)", () => {
  const audiobook = () =>
    item(
      { title: "Audiobook", source_type: "audiobook", source_ref_type: "audiobook_reminder", rrule: "FREQ=DAILY", event_type: "wellness_nudge" },
      { occurrence_index: null, start_time: "2026-10-10T18:00:00Z", end_time: "2026-10-10T18:20:00Z" },
    );

  it("has a localised title and source", () => {
    expect(isAudiobookEntry(audiobook())).toBe(true);
    expect(entryTitle(audiobook().event!)).toBe("vcal.audiobook.title");
    expect(sourceLabel(audiobook())).toBe("vcal.source.audiobook");
  });

  it("opens the player, never offers 'mark done', and cannot be invited to", () => {
    const onOpenSource = vi.fn();
    render(<EntryScreen item={audiobook()} now={NOW} onClose={() => {}} onComplete={() => {}} onOpenSource={onOpenSource} onInvite={() => {}} />);
    fireEvent.click(screen.getByTestId("vcal-listen"));
    expect(onOpenSource).toHaveBeenCalledWith("/autopilot/audiobook");
    expect(screen.queryByTestId("vcal-complete")).toBeNull();
    expect(screen.queryByTestId("vcal-invite")).toBeNull();
  });
});

describe("the invite picker (VTID-04917)", () => {
  it("lists real direct chats and groups — never the Vitana bot or a legacy thread", () => {
    expect(dmTargets(h.threads as never)).toEqual([{ kind: "dm", id: "peer-1", name: "Ana" }]);
  });

  it("sends nothing until a chat is picked, then sends only the entry id", async () => {
    wrap(<InviteToChatSheet item={item()} onClose={() => {}} />);
    await screen.findByText("Ana");
    expect(screen.getByText("Laufgruppe")).toBeTruthy();
    expect(screen.queryByText("Vitana")).toBeNull();
    const send = screen.getByTestId("vcal-invite-send") as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.click(send);
    expect(h.sendChatMessage).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Ana"));
    expect(send.textContent).toBe('vcal.invite.sendTo:{"name":"Ana"}');
    fireEvent.click(send);
    await waitFor(() => expect(h.sendChatMessage).toHaveBeenCalledWith("peer-1", "", { messageType: "calendar_invite", contentData: { entry_id: "e1" } }));
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith("vcal.invite.sent", undefined, { name: "Ana" }));
  });

  it("a group gets the same invite through the group route", async () => {
    const onClose = vi.fn();
    wrap(<InviteToChatSheet item={item()} onClose={onClose} />);
    fireEvent.click(await screen.findByText("Laufgruppe"));
    fireEvent.click(screen.getByTestId("vcal-invite-send"));
    await waitFor(() => expect(h.sendGroupMessage).toHaveBeenCalledWith("g-1", "", { messageType: "calendar_invite", contentData: { entry_id: "e1" } }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("Escape closes the picker only, never the entry screen underneath", async () => {
    const closeSheet = vi.fn();
    const closeEntry = vi.fn();
    wrap(
      <>
        <EntryScreen item={item()} now={NOW} onClose={closeEntry} onInvite={() => {}} />
        <InviteToChatSheet item={item()} onClose={closeSheet} />
      </>,
    );
    await screen.findByText("Ana");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(closeSheet).toHaveBeenCalledTimes(1);
    expect(closeEntry).not.toHaveBeenCalled();
  });

  it("search narrows the list; a refusal is named", async () => {
    h.sendChatMessage.mockRejectedValue(new Error("NOT_INVITABLE"));
    wrap(<InviteToChatSheet item={item()} onClose={() => {}} />);
    await screen.findByText("Ana");
    fireEvent.change(screen.getByTestId("vcal-invite-search"), { target: { value: "lauf" } });
    expect(screen.queryByText("Ana")).toBeNull();
    fireEvent.change(screen.getByTestId("vcal-invite-search"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Ana"));
    fireEvent.click(screen.getByTestId("vcal-invite-send"));
    await waitFor(() => expect(h.notifyError).toHaveBeenCalledWith("vcal.invite.notInvitable"));
  });
});
