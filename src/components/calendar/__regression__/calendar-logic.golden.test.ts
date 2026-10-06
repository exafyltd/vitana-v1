/* eslint-disable @typescript-eslint/no-explicit-any -- fixtures build partial calendar rows on purpose */
/**
 * VTID-04459 — app calendar regression suite: the calendar's own logic, pinned.
 *
 * Runs fixed scenarios through the real helpers behind /calendar (German
 * catalogue, Europe/Berlin device zone) and
 * compares them with __golden__/calendar-logic.json:
 *   - which range each view asks the gateway for, and how ‹ › step;
 *   - the words and times on screen (greeting, "in 12 Min.", reminder chips,
 *     the next reminder, source labels, emoji, colour kind, done state);
 *   - the gateway client: URLs, methods, headers, bodies, error mapping.
 * VTID-04915 retired the older popup, its cards, its natural-language parser
 * and the pending-invite queue, and their scenarios with them.
 * An intended change is re-recorded (UPDATE_CALENDAR_GOLDEN=1) and committed.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { assertBerlin, expectGolden } from "./golden";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }) } },
}));

import { greetingKey, hhmm, nextReminderAt, relativeIn, reminderLabel, sameDay, stepAnchor, timeRange, toLocalInput, viewRange, type CalendarView } from "../vcal/time";
import { itemEmoji, itemsOn, sourceLabel } from "../vcal/labels";
import { KIND_STYLE, SURFACE, entryKind, isDone } from "../vcal/theme";
import {
  CalendarApiError,
  completeCalendarEntry,
  createFeedLink,
  disableGoogleSync,
  enableGoogleSync,
  feedUrlFromPath,
  fetchCalendarWindow,
  fetchFeedStatus,
  fetchGoogleSyncStatus,
  isWorkItem,
  moveBlockReasonOf,
  moveCalendarEntry,
  revokeFeedLink,
  webcalUrl,
  type CalendarWindowItem,
} from "@/lib/calendar-window-client";

const G = "calendar-logic";
const iso = (d: Date | null) => (d ? d.toISOString() : null);

beforeAll(() => assertBerlin());

function item(over: Partial<CalendarWindowItem> & { id: string }, ev: Record<string, unknown> | null = {}): CalendarWindowItem {
  return {
    event_id: over.id,
    start_time: "2026-10-05T07:30:00.000Z",
    end_time: "2026-10-05T08:00:00.000Z",
    busy: ev === null,
    occurrence_index: null,
    event:
      ev === null
        ? null
        : ({
            id: over.id,
            title: over.id,
            description: null,
            location: null,
            event_type: "personal",
            source_type: "manual",
            source_ref_type: null,
            pillar: null,
            wellness_tags: [],
            completion_status: null,
            completed_at: null,
            rrule: null,
            emoji: null,
            ...ev,
          } as unknown as CalendarWindowItem["event"]),
    ...over,
  } as CalendarWindowItem;
}

// -----------------------------------------------------------------------------
// Views and navigation
// -----------------------------------------------------------------------------

describe("views", () => {
  const anchors = {
    wednesday: new Date(2026, 8, 23, 15, 0),
    sunday_before_dst_end: new Date(2026, 9, 25, 1, 30),
    month_starting_monday: new Date(2026, 5, 10),
    first_of_month_sunday: new Date(2026, 10, 1, 12),
    leap_feb: new Date(2028, 1, 29, 9),
    new_year: new Date(2026, 11, 31, 23, 30),
  };

  it("the range each view asks the gateway for (never over 62 days)", () => {
    const out: Record<string, unknown> = {};
    for (const [name, a] of Object.entries(anchors)) {
      for (const v of ["day", "week", "month"] as CalendarView[]) {
        const r = viewRange(v, a);
        expect((r.to.getTime() - r.from.getTime()) / 86_400_000).toBeLessThanOrEqual(62);
        out[`${name}.${v}`] = [iso(r.from), iso(r.to)];
      }
    }
    expectGolden(G, "views.range", out);
  });

  it("‹ and › step one day, week or month", () => {
    const out: Record<string, unknown> = {};
    for (const [name, a] of Object.entries(anchors)) {
      for (const v of ["day", "week", "month"] as CalendarView[]) {
        out[`${name}.${v}`] = [iso(stepAnchor(v, a, -1)), iso(stepAnchor(v, a, 1))];
      }
    }
    expectGolden(G, "views.step", out);
  });

  it("same local day", () => {
    expectGolden(G, "views.sameDay", [
      sameDay(new Date(2026, 9, 5, 0, 0), new Date(2026, 9, 5, 23, 59)),
      sameDay(new Date(2026, 9, 5, 23, 59), new Date(2026, 9, 6, 0, 0)),
      sameDay(new Date("2026-10-04T22:30:00Z"), new Date(2026, 9, 5, 12)), // 00:30 Berlin on the 5th
    ]);
  });
});

// -----------------------------------------------------------------------------
// Words and times on screen
// -----------------------------------------------------------------------------

describe("wording", () => {
  it("greeting by local hour", () => {
    expectGolden(G, "wording.greeting", [0, 4, 5, 11, 12, 17, 18, 23].map((h) => [h, greetingKey(new Date(2026, 9, 5, h, 30))]));
  });

  it("times, ranges and the move picker value", () => {
    expectGolden(G, "wording.times", {
      hhmm: [hhmm("2026-10-05T07:30:00Z"), hhmm("2026-10-25T00:30:00Z"), hhmm("2026-10-25T01:30:00Z"), hhmm(new Date(2026, 0, 1, 0, 5))],
      range: [timeRange("2026-10-05T07:30:00Z", "2026-10-05T08:00:00Z"), timeRange("2026-10-05T07:30:00Z", null)],
      input: [toLocalInput(new Date("2026-10-05T07:30:00Z")), toLocalInput(new Date(2026, 0, 2, 3, 4))],
    });
  });

  it("'in …' is never negative", () => {
    const now = new Date("2026-10-05T07:00:00Z");
    const targets = [-60, 0, 1, 12, 59, 60, 89, 90, 120, 35 * 60, 36 * 60, 48 * 60, 10 * 24 * 60];
    expectGolden(G, "wording.relative", targets.map((m) => [m, relativeIn(new Date(now.getTime() + m * 60_000).toISOString(), now)]));
  });

  it("reminder chips and the next reminder to come", () => {
    const rules = [
      { kind: "before", minutes: 0 },
      { kind: "before", minutes: 10 },
      { kind: "before", minutes: 60 },
      { kind: "before", minutes: 90 },
      { kind: "before", minutes: 1440 },
      { kind: "evening_before", hour: 19 },
    ] as const;
    expectGolden(G, "wording.reminderLabel", rules.map((r) => reminderLabel(r as any)));
    const start = "2026-10-06T06:30:00.000Z"; // 08:30 Berlin
    const nows = ["2026-10-05T12:00:00Z", "2026-10-05T17:30:00Z", "2026-10-06T05:25:00Z", "2026-10-06T06:31:00Z"];
    expectGolden(
      G,
      "wording.nextReminder",
      nows.map((n) => [n, iso(nextReminderAt(rules as any, start, new Date(n))), iso(nextReminderAt([{ kind: "before", minutes: 10 }] as any, start, new Date(n)))]),
    );
    expect(nextReminderAt(undefined, start, new Date())).toBeNull();
    expect(nextReminderAt([], start, new Date())).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// Entry look: kind, colour, emoji, source label, done
// -----------------------------------------------------------------------------

describe("entry look", () => {
  const ITEMS: CalendarWindowItem[] = [
    item({ id: "plain" }),
    item({ id: "lab" }, { source_type: "lab_order", pillar: "exercise" }),
    item({ id: "lab-ref" }, { source_ref_type: "lab_order" }),
    item({ id: "pillar" }, { pillar: "sleep" }),
    item({ id: "pillar-tag" }, { wellness_tags: ["x", "pillar:hydration"] }),
    item({ id: "bad-pillar" }, { pillar: "joy", event_type: "workout" }),
    ...["workout", "nutrition", "community", "health", "autopilot", "journey_milestone", "wellness_nudge", "professional", "admin_task", "dev_task", "deployment", "sprint_milestone", "personal"].map((t) =>
      item({ id: `type-${t}` }, { event_type: t }),
    ),
    item({ id: "src-autopilot" }, { source_type: "autopilot" }),
    item({ id: "src-plan" }, { source_type: "health_plan" }),
    item({ id: "src-goal" }, { source_type: "goal_plan" }),
    item({ id: "src-assistant" }, { source_type: "assistant" }),
    item({ id: "src-rsvp" }, { source_type: "community_rsvp" }),
    item({ id: "src-live" }, { source_type: "live_room" }),
    item({ id: "src-journey" }, { source_type: "guided_journey" }),
    item({ id: "work", work: { kind: "deploy_prod", source_id: "d1", params: {} } } as any, { event_type: "deployment", emoji: "🚀" }),
    item({ id: "display-emoji", display_emoji: "🎸" } as any, { emoji: "🎉" }),
    item({ id: "own-emoji" }, { emoji: "🍎" }),
    item({ id: "done-status" }, { completion_status: "completed" }),
    item({ id: "done-at" }, { completed_at: "2026-10-01T00:00:00Z" }),
    item({ id: "skipped" }, { completion_status: "skipped" }),
    item({ id: "busy" }, null),
  ];

  it("kind, emoji, source label, done, work item", () => {
    expectGolden(
      G,
      "look.entries",
      ITEMS.map((i) => ({
        id: i.id,
        kind: i.event ? entryKind(i.event) : null,
        emoji: itemEmoji(i),
        source: sourceLabel(i),
        done: i.event ? isDone(i.event) : null,
        work: isWorkItem(i),
      })),
    );
  });

  it("the colour language", () => {
    expectGolden(G, "look.palette", { kinds: KIND_STYLE, surface: SURFACE });
  });

  it("items on a local day", () => {
    const list = [
      item({ id: "a", start_time: "2026-10-04T22:30:00.000Z" }), // 00:30 on the 5th in Berlin
      item({ id: "b", start_time: "2026-10-05T21:59:00.000Z" }), // 23:59 on the 5th
      item({ id: "c", start_time: "2026-10-05T22:00:00.000Z" }), // 00:00 on the 6th
    ];
    expectGolden(G, "look.itemsOn", itemsOn(list, new Date(2026, 9, 5)).map((i) => i.id));
  });
});

// -----------------------------------------------------------------------------
// Gateway client: what goes over the wire
// -----------------------------------------------------------------------------

describe("gateway client", () => {
  const sent: Array<{ url: string; method: string; headers: Record<string, string>; body: unknown }> = [];
  let reply: { status: number; body: unknown } = { status: 200, body: { ok: true } };
  const realFetch = globalThis.fetch;

  beforeAll(() => {
    globalThis.fetch = vi.fn(async (url: string, init: RequestInit = {}) => {
      sent.push({
        url: String(url),
        method: init.method ?? "GET",
        headers: init.headers as Record<string, string>,
        body: init.body ? JSON.parse(String(init.body)) : null,
      });
      return new Response(JSON.stringify(reply.body), { status: reply.status });
    }) as unknown as typeof fetch;
  });
  afterAll(() => {
    globalThis.fetch = realFetch;
  });
  beforeEach(() => {
    sent.length = 0;
    reply = { status: 200, body: { ok: true } };
  });

  it("requests: paths, methods, role header, bodies", async () => {
    reply = {
      status: 200,
      body: {
        ok: true,
        timezone: "Europe/Berlin",
        data: [
          { id: "b", start_time: "2026-10-05T09:00:00Z" },
          { id: "a", start_time: "2026-10-05T07:00:00Z" },
        ],
      },
    };
    const win = await fetchCalendarWindow(new Date("2026-10-05T00:00:00Z"), new Date("2026-10-06T00:00:00Z"), "professional");
    reply = { status: 200, body: { ok: true, data: { active: true, created_at: "2026-10-01T00:00:00Z" } } };
    const feed = await fetchFeedStatus();
    reply = { status: 200, body: { ok: true, data: { availability: "ready", enabled: true, last_push_at: null } } };
    const google = await fetchGoogleSyncStatus();
    reply = { status: 201, body: { ok: true, data: { feed_path: "/api/v1/calendar/feed/tok.ics" } } };
    const link = await createFeedLink();
    reply = { status: 200, body: { ok: true } };
    await completeCalendarEntry("e 1/2", null);
    await moveCalendarEntry("e1", new Date("2026-10-06T07:30:00Z"), "community");
    await revokeFeedLink();
    const enabled = await enableGoogleSync();
    await disableGoogleSync();
    expectGolden(G, "client.requests", {
      sent: sent.map((s) => ({ ...s, url: s.url.replace(/^.*?(\/api\/v1)/, "$1") })),
      results: { win, feed, google, link: link.replace(/^.*?(\/api\/v1)/, "$1"), enabled },
    });
  });

  it("errors: HTTP status, ok:false, move refusals, Google needing a connection", async () => {
    const out: Record<string, unknown> = {};
    const cases: Array<[string, { status: number; body: unknown }, () => Promise<unknown>]> = [
      ["http_500", { status: 500, body: {} }, () => fetchCalendarWindow(new Date(0), new Date(1), null)],
      ["ok_false", { status: 200, body: { ok: false, error: "boom" } }, () => fetchCalendarWindow(new Date(0), new Date(1), null)],
      ["not_json", { status: 502, body: "x" }, () => fetchFeedStatus()],
      ["move_owned", { status: 409, body: { ok: false, error: "NOT_MOVABLE", reason: "owned_by_source" } }, () => moveCalendarEntry("e1", new Date(0), null)],
      ["move_unknown_reason", { status: 409, body: { ok: false, error: "NOT_MOVABLE", reason: "odd" } }, () => moveCalendarEntry("e1", new Date(0), null)],
      ["google_not_connected", { status: 409, body: { ok: false, error: "not_connected" } }, () => enableGoogleSync()],
      ["google_not_configured", { status: 503, body: { ok: false, error: "not_configured" } }, () => enableGoogleSync()],
      ["feed_no_path", { status: 201, body: { ok: true, data: {} } }, () => createFeedLink()],
    ];
    for (const [name, r, run] of cases) {
      reply = r;
      try {
        out[name] = { resolved: await run() };
      } catch (err) {
        const e = err as CalendarApiError;
        out[name] = { error: e.message, status: e.status, name: e.name, moveReason: moveBlockReasonOf(e) };
      }
    }
    expectGolden(G, "client.errors", out);
  });

  it("feed link forms", () => {
    expectGolden(G, "client.links", [
      feedUrlFromPath("/api/v1/calendar/feed/t.ics", "https://gateway.example"),
      webcalUrl("https://gateway.example/api/v1/calendar/feed/t.ics"),
      webcalUrl("http://x/y.ics"),
      moveBlockReasonOf(new Error("NOT_MOVABLE")),
    ]);
  });
});
