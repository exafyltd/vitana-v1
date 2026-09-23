/**
 * VTID-04351 — calendar screen helpers and gateway client.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }) } },
}));

import { entryKind, isDone, KIND_STYLE } from "./theme";
import { nextReminderAt, stepAnchor, viewRange } from "./time";
import { completeCalendarEntry, fetchCalendarWindow } from "@/lib/calendar-window-client";

const base = { event_type: "personal", pillar: null, wellness_tags: [], source_type: "manual", source_ref_type: null };

describe("entryKind", () => {
  it("lab orders win over everything", () => {
    expect(entryKind({ ...base, source_ref_type: "lab_order", pillar: "exercise" })).toBe("lab");
  });
  it("pillar column, then pillar tag, then event type", () => {
    expect(entryKind({ ...base, pillar: "sleep" })).toBe("sleep");
    expect(entryKind({ ...base, wellness_tags: ["x", "pillar:hydration"] })).toBe("hydration");
    expect(entryKind({ ...base, event_type: "workout" })).toBe("exercise");
    expect(entryKind({ ...base, event_type: "community" })).toBe("community");
    expect(entryKind({ ...base, event_type: "autopilot" })).toBe("vitana");
    expect(entryKind({ ...base, event_type: "dev_task" })).toBe("work");
    expect(entryKind(base)).toBe("personal");
  });
  it("every kind has colours and an emoji", () => {
    for (const s of Object.values(KIND_STYLE)) {
      expect(s.bg).toMatch(/^#/);
      expect(s.accent).toMatch(/^#/);
      expect(s.emoji.length).toBeGreaterThan(0);
    }
  });
  it("done means completed status or a completed_at", () => {
    expect(isDone({ completion_status: "completed", completed_at: null })).toBe(true);
    expect(isDone({ completion_status: null, completed_at: "2026-09-23T08:00:00Z" })).toBe(true);
    expect(isDone({ completion_status: "skipped", completed_at: null })).toBe(false);
  });
});

describe("ranges", () => {
  const wed = new Date(2026, 8, 23, 15, 0); // Wed 23 Sep 2026
  it("day is local midnight to midnight", () => {
    const r = viewRange("day", wed);
    expect(r.from).toEqual(new Date(2026, 8, 23));
    expect(r.to).toEqual(new Date(2026, 8, 24));
  });
  it("week starts Monday", () => {
    const r = viewRange("week", wed);
    expect(r.from).toEqual(new Date(2026, 8, 21));
    expect(r.to).toEqual(new Date(2026, 8, 28));
  });
  it("month is the 6-week grid, within the gateway's 62-day cap", () => {
    const r = viewRange("month", wed);
    expect(r.from).toEqual(new Date(2026, 7, 31)); // Monday before 1 Sep
    expect((r.to.getTime() - r.from.getTime()) / 86_400_000).toBeLessThanOrEqual(62);
  });
  it("stepping moves by the view's unit", () => {
    expect(stepAnchor("day", wed, 1)).toEqual(new Date(2026, 8, 24, 15, 0));
    expect(stepAnchor("week", wed, -1)).toEqual(new Date(2026, 8, 16, 15, 0));
    expect(stepAnchor("month", wed, 1)).toEqual(new Date(2026, 9, 1));
  });
});

describe("nextReminderAt", () => {
  const start = new Date(2026, 8, 26, 8, 0).toISOString(); // Fri 08:00 local
  const rules = [
    { kind: "evening_before" as const, hour: 19 },
    { kind: "before" as const, minutes: 60 },
  ];
  it("picks the earliest reminder still to come", () => {
    expect(nextReminderAt(rules, start, new Date(2026, 8, 24))).toEqual(new Date(2026, 8, 25, 19, 0));
    expect(nextReminderAt(rules, start, new Date(2026, 8, 25, 20, 0))).toEqual(new Date(2026, 8, 26, 7, 0));
    expect(nextReminderAt(rules, start, new Date(2026, 8, 26, 7, 30))).toBeNull();
    expect(nextReminderAt(undefined, start, new Date())).toBeNull();
  });
});

describe("gateway client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the window with the bearer and active role, sorted by start", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        timezone: "Europe/Berlin",
        data: [
          { id: "b", start_time: "2026-09-23T12:00:00Z" },
          { id: "a", start_time: "2026-09-23T08:00:00Z" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const w = await fetchCalendarWindow(new Date("2026-09-23T00:00:00Z"), new Date("2026-09-24T00:00:00Z"), "community");
    expect(w.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(w.timezone).toBe("Europe/Berlin");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/calendar/events/window?from=2026-09-23T00%3A00%3A00.000Z&to=2026-09-24T00%3A00%3A00.000Z");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(init.headers["X-Vitana-Active-Role"]).toBe("community");
  });

  it("surfaces a gateway error instead of an empty calendar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: "Internal error" }) }));
    await expect(fetchCalendarWindow(new Date(), new Date(Date.now() + 1000), null)).rejects.toThrow("Internal error");
  });

  it("marks an entry done with POST …/complete", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    await completeCalendarEntry("ev 1", "community");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/calendar/events/ev%201/complete");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ completion_status: "completed" });
  });
});

describe("catalog", () => {
  it("every locale ships the same vcal keys as German", () => {
    const dir = path.resolve(__dirname, "../../../i18n");
    const keys = (o: Record<string, unknown>, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [p + k] : keys(v as Record<string, unknown>, p + k + ".")));
    const de = keys(JSON.parse(fs.readFileSync(path.join(dir, "de/vcal.json"), "utf8"))).sort();
    for (const loc of fs.readdirSync(dir).filter((d) => fs.statSync(path.join(dir, d)).isDirectory())) {
      const file = path.join(dir, loc, "vcal.json");
      expect(fs.existsSync(file)).toBe(true);
      expect(keys(JSON.parse(fs.readFileSync(file, "utf8"))).sort()).toEqual(de);
    }
  });
});

describe("work-lens items (VTID-04357)", () => {
  const src = (p: string) => fs.readFileSync(path.resolve(__dirname, p), "utf8");

  it("deploys, reviews and deadlines are work entries", () => {
    for (const t of ["deployment", "dev_task", "admin_task"]) {
      expect(entryKind({ ...base, event_type: t })).toBe("work");
    }
  });

  it("every work kind the gateway sends has a label in German", () => {
    const de = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../i18n/de/vcal.json"), "utf8"));
    for (const k of ["deploy_staging", "deploy_prod", "autopilot_review", "ticket_due", "erp_approval", "readOnly"]) {
      expect(typeof de.vcal.work[k]).toBe("string");
    }
  });

  it("the entry screen never offers 'mark done' for a work item", () => {
    expect(src("./EntryScreen.tsx")).toMatch(/canComplete = [^;]*!item\.work/);
  });

  it("work items stay out of the personal progress ring and Next up", () => {
    expect(src("../../../pages/Calendar.tsx")).toContain("filter((i) => i.event && !i.work)");
  });

  it("the source label comes from the work kind", () => {
    expect(src("./labels.ts")).toContain("if (item.work) return t(`vcal.work.${item.work.kind}`)");
  });
});

describe("calendar subscription link (VTID-04358)", () => {
  it("builds the https and webcal URLs from the gateway path", async () => {
    const { feedUrlFromPath, webcalUrl } = await import("@/lib/calendar-window-client");
    const url = feedUrlFromPath("/api/v1/calendar/feed/abc.ics", "https://gw.example");
    expect(url).toBe("https://gw.example/api/v1/calendar/feed/abc.ics");
    expect(webcalUrl(url)).toBe("webcal://gw.example/api/v1/calendar/feed/abc.ics");
  });

  it("the sheet is reachable from the calendar header", () => {
    const page = fs.readFileSync(path.resolve(__dirname, "../../../pages/Calendar.tsx"), "utf8");
    expect(page).toContain("setSubscribeOpen(true)");
    expect(page).toContain("<SubscribeSheet");
  });

  it("every locale has the subscribe strings", () => {
    for (const loc of ["de", "en", "es", "fr", "pt", "pl", "ru", "sr", "tr", "zh", "ar"]) {
      const j = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../i18n/${loc}/vcal.json`), "utf8"));
      expect(Object.keys(j.vcal.subscribe)).toHaveLength(16);
    }
  });
});

describe("move an entry (VTID-04374)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts the new start and keeps the role header", async () => {
    const { moveCalendarEntry } = await import("@/lib/calendar-window-client");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    await moveCalendarEntry("ev 1", new Date("2026-10-06T08:00:00Z"), "community");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/calendar/events/ev%201/move");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ start_time: "2026-10-06T08:00:00.000Z" });
    expect(init.headers["X-Vitana-Active-Role"]).toBe("community");
  });

  it("a refused move carries its reason; anything else has none", async () => {
    const { moveCalendarEntry, moveBlockReasonOf } = await import("@/lib/calendar-window-client");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ ok: false, error: "NOT_MOVABLE", reason: "owned_by_source" }) }));
    const err = await moveCalendarEntry("e", new Date(), null).catch((e) => e);
    expect(moveBlockReasonOf(err)).toBe("owned_by_source");
    expect(moveBlockReasonOf(new Error("x"))).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ ok: false, error: "NOT_MOVABLE", reason: "weird" }) }));
    expect(moveBlockReasonOf(await moveCalendarEntry("e", new Date(), null).catch((e) => e))).toBeNull();
  });

  it("the picker value is the device's local wall-clock time", async () => {
    const { toLocalInput } = await import("./time");
    const d = new Date(2026, 9, 6, 7, 5); // 6 Oct 2026 07:05 local
    expect(toLocalInput(d)).toBe("2026-10-06T07:05");
    expect(new Date(toLocalInput(d)).getTime()).toBe(d.getTime());
  });
});

describe("Google Calendar sync (VTID-04372)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads status, defaulting to not_configured", async () => {
    const { fetchGoogleSyncStatus } = await import("@/lib/calendar-window-client");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, data: { availability: "ready", enabled: true, last_push_at: "2026-10-05T10:00:00Z" } }) }));
    expect(await fetchGoogleSyncStatus()).toEqual({ availability: "ready", enabled: true, last_push_at: "2026-10-05T10:00:00Z", last_error: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, data: {} }) }));
    expect((await fetchGoogleSyncStatus()).availability).toBe("not_configured");
  });

  it("enable: on, or 'connect Google first' on 409 not_connected; other errors throw", async () => {
    const { enableGoogleSync } = await import("@/lib/calendar-window-client");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
    expect(await enableGoogleSync()).toBe("enabled");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ ok: false, error: "not_connected", connect_url: "/c" }) }));
    expect(await enableGoogleSync()).toBe("needs_google");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ ok: false, error: "not_configured" }) }));
    await expect(enableGoogleSync()).rejects.toThrow("not_configured");
  });
});
