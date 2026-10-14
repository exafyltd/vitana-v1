/**
 * VTID-05172 — Life Timeline P6: the Memory section refresh.
 * The gateway clients are mocked; React Query and the cards run for real.
 *  - this week's Index story (rising / slipping / balance / way into the timeline), honest empty state
 *  - routines Vitana noticed: one sentence per kind, forgettable
 *  - learning switches are saved (and disabled until the gateway has them)
 *  - usage data: count, delete behind a confirmation
 *  - "Vitana noticed" insight renders as a sentence
 *  - source contract: ScreenFrame "collection", no mock data, manifest migrated, i18n parity + du-form
 */
import fs from "node:fs";
import path from "node:path";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/i18n-toast", async (orig) => ({
  ...(await orig<typeof import("@/lib/i18n-toast")>()),
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k}${JSON.stringify(p)}` : `${k}§`),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/hooks/useVitanaIndex", () => ({ pillarLabel: (p: string) => `P:${p}` }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

const api = vi.hoisted(() => ({
  fetchLearningPrefs: vi.fn(),
  setLearningPref: vi.fn(),
  fetchUsageData: vi.fn(),
  exportUsageData: vi.fn(),
  deleteUsageData: vi.fn(),
  fetchRoutines: vi.fn(),
  forgetRoutine: vi.fn(),
}));
vi.mock("@/lib/memory-learning-api", async (orig) => ({
  ...(await orig<typeof import("@/lib/memory-learning-api")>()),
  ...Object.fromEntries(Object.keys(api).map((k) => [k, (...a: unknown[]) => (api as Record<string, (...x: unknown[]) => unknown>)[k](...a)])),
}));
const fetchTimelineSpotlight = vi.hoisted(() => vi.fn());
vi.mock("@/lib/timeline-api", async (orig) => ({
  ...(await orig<typeof import("@/lib/timeline-api")>()),
  fetchTimelineSpotlight: () => fetchTimelineSpotlight(),
}));

import { IndexWeekStory } from "./IndexWeekStory";
import { RoutinesCard } from "./RoutinesCard";
import { LearningSwitches } from "./LearningSwitches";
import { UsageDataCard } from "./UsageDataCard";
import { routineSentence } from "./routine-text";
import { momentFacts } from "@/components/timeline/timeline-meta";

function renderWith(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const SPOTLIGHT = {
  score_total: 306,
  tier: "building",
  change_today: 6,
  change_7d: 26,
  pillars: {
    nutrition: { score: 62, change_today: 0, momentum: "steady" },
    hydration: { score: 52, change_today: 6, momentum: "rising" },
    exercise: { score: 60, change_today: 0, momentum: "rising" },
    sleep: { score: 54, change_today: 0, momentum: "slipping" },
    mental: { score: 60, change_today: 0, momentum: "steady" },
  },
  balance: { factor: 0.9, penalty_pct: 10, reason_key: "timeline.balance.held_back", weakest_pillar: "hydration" },
  weakest_pillar: "hydration",
  strongest_pillar: "nutrition",
  top_contributors: [],
  last_computed: "2026-10-14",
};

beforeEach(() => {
  for (const f of Object.values(api)) f.mockReset();
  fetchTimelineSpotlight.mockReset();
});

describe("this week's Index story", () => {
  it("says what rose, what slipped, what the balance costs, and links into the timeline", async () => {
    fetchTimelineSpotlight.mockResolvedValue(SPOTLIGHT);
    renderWith(<IndexWeekStory />);
    const card = await screen.findByTestId("memory-week-story");
    expect(card.textContent).toContain("306");
    expect(card.textContent).toContain('memoryLearning.week.change{"delta":"⁦+26⁩"}');
    expect(within(card).getByTestId("memory-week-rising").textContent).toContain('"pillars":"P:hydration, P:exercise"');
    expect(within(card).getByTestId("memory-week-slipping").textContent).toContain("P:sleep");
    expect(card.textContent).toContain('timeline.balance.held_back{"pillar":"P:hydration","pct":"10"}');
    expect(within(card).getByTestId("memory-week-open-timeline").getAttribute("href")).toBe("/memory/timeline");
  });

  it("without an Index: an honest prompt, no numbers", async () => {
    fetchTimelineSpotlight.mockResolvedValue(null);
    renderWith(<IndexWeekStory />);
    const card = await screen.findByTestId("memory-week-empty");
    expect(card.textContent).toContain("memoryLearning.week.empty");
    expect(card.textContent).not.toMatch(/\d{2,}/);
  });
});

describe("routines Vitana noticed", () => {
  it("one sentence per kind, from kind + metadata", () => {
    const r = (routine_kind: string, metadata: Record<string, unknown>) => routineSentence({ id: "x", routine_kind, routine_key: "k", metadata, confidence: 0.8 } as never);
    expect(r("screen_habit", { path: "/community", days: 12 })).toBe('memoryLearning.routine.screen_habit{"screen":"/community","days":"12"}');
    expect(r("active_hours", { bucket: "evening" })).toBe('memoryLearning.routine.active_hours{"bucket":"memoryLearning.bucket.evening§"}');
    expect(r("feature_affinity", { category: "community" })).toBe('memoryLearning.routine.feature_affinity{"area":"timeline.category.community§"}');
    expect(r("pillar_rhythm", { pillar: "sleep", bucket: "night", days_per_week: 4.6 })).toBe('memoryLearning.routine.pillar_rhythm{"pillar":"P:sleep","bucket":"memoryLearning.bucket.night§","n":"5"}');
    expect(r("time_of_day_preference", { time_of_day: "morning" })).toContain("memoryLearning.routine.time_of_day_preference");
    expect(r("day_of_week_rhythm", { dow_index: 0 })).toContain("memoryLearning.routine.day_of_week_rhythm");
    expect(r("category_affinity", { tag: "yoga" })).toBe('memoryLearning.routine.category_affinity{"tag":"yoga"}');
    expect(r("wave_velocity", {})).toBe("memoryLearning.routine.generic§");
    expect(r("active_hours", { bucket: "<script>" })).toBe("memoryLearning.routine.generic§");
  });

  it("lists them and forgets one", async () => {
    api.fetchRoutines.mockResolvedValue([{ id: "r1", routine_kind: "active_hours", routine_key: "overall", metadata: { bucket: "morning" }, confidence: 0.8 }]);
    api.forgetRoutine.mockResolvedValue(undefined);
    renderWith(<RoutinesCard />);
    const rows = await screen.findAllByTestId("memory-routine");
    expect(rows).toHaveLength(1);
    await act(async () => {
      fireEvent.click(within(rows[0]).getByRole("button"));
    });
    await waitFor(() => expect(api.forgetRoutine).toHaveBeenCalledWith("r1"));
  });

  it("empty: says why there is nothing yet", async () => {
    api.fetchRoutines.mockResolvedValue([]);
    renderWith(<RoutinesCard />);
    expect(await screen.findByTestId("memory-routines-empty")).toBeTruthy();
  });
});

describe("what Vitana may learn from", () => {
  const prefs = (available = true) => ({
    available,
    prefs: ["nutrition", "hydration", "exercise", "sleep", "mental", "cross_pillar", "diary", "goals", "journey", "vitana", "community", "events", "live_media", "shop", "wallet", "account", "app_usage"].map((category) => ({ category, learn: category !== "community" })),
  });

  it("every switch is saved; app usage is last with its consequence", async () => {
    api.fetchLearningPrefs.mockResolvedValue(prefs());
    api.setLearningPref.mockResolvedValue({ routines_deleted: 2 });
    renderWith(<LearningSwitches />);
    const sw = await screen.findByTestId("learn-switch-app_usage");
    expect(sw.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("learn-switch-community").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByTestId("memory-learning-switches").textContent).toContain("memoryLearning.switches.appUsageOff");
    await act(async () => {
      fireEvent.click(sw);
    });
    await waitFor(() => expect(api.setLearningPref).toHaveBeenCalledWith("app_usage", false));
  });

  it("disabled with an honest note until the gateway has them", async () => {
    api.fetchLearningPrefs.mockResolvedValue(prefs(false));
    renderWith(<LearningSwitches />);
    expect(await screen.findByTestId("memory-learning-unavailable")).toBeTruthy();
    expect((screen.getByTestId("learn-switch-sleep") as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("usage data", () => {
  it("shows the count and deletes only after confirming", async () => {
    api.fetchUsageData.mockResolvedValue({ available: true, count: 1234 });
    api.deleteUsageData.mockResolvedValue({ deleted: 1234, routines_deleted: 3 });
    renderWith(<UsageDataCard />);
    expect((await screen.findByTestId("memory-usage-count")).textContent).toContain("memoryLearning.usage.count");
    fireEvent.click(screen.getByTestId("memory-usage-delete"));
    expect(api.deleteUsageData).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(await screen.findByTestId("memory-usage-delete-confirm"));
    });
    await waitFor(() => expect(api.deleteUsageData).toHaveBeenCalledTimes(1));
  });

  it("before the gateway has it: no buttons to press", async () => {
    api.fetchUsageData.mockResolvedValue({ available: false, count: null });
    renderWith(<UsageDataCard />);
    expect((await screen.findByTestId("memory-usage-count")).textContent).toContain("memoryLearning.usage.countUnavailable");
    expect((screen.getByTestId("memory-usage-export") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("memory-usage-delete") as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('"Vitana noticed" on the timeline', () => {
  it("reads as one sentence about its pillar", () => {
    expect(momentFacts({ summary: { key: "x", params: { insight_kind: "weakest_pillar_streak", pillar: "hydration" } } })).toEqual([
      'timeline.insight.weakest_pillar_streak{"pillar":"P:hydration"}',
    ]);
    expect(momentFacts({ summary: { key: "x", params: { insight_kind: "made_up", pillar: "sleep" } } })).toEqual(["P:sleep"]);
  });
});

describe("VTID-05172 source contract", () => {
  const read = (p: string) => fs.readFileSync(path.join(__dirname, "../../..", p), "utf8");
  it("both pages: ScreenFrame \"collection\" behind the Spotlight flag; no mock data, no fake sync time, no dead switches", () => {
    for (const p of ["pages/Memory.tsx", "pages/memory/Permissions.tsx"]) {
      const src = read(p);
      expect(src).toContain("const spotlight = useSpotlightEnabled();");
      expect(src).toContain('archetype="collection"');
      expect(src).not.toMatch(/mockSyncTimestamp|recentMemories|privacySettings|accessControls|securityFeatures|unsplash|defaultChecked/);
    }
  });
  it("manifest marks /memory and /memory/permissions migrated", () => {
    const m = JSON.parse(read("design/screen-manifest.json"));
    for (const p of ["/memory", "/memory/permissions"]) {
      expect(m.screens.find((s: { path: string }) => s.path === p)).toMatchObject({ archetype: "collection", status: "migrated" });
    }
  });
  it("German and English carry the same keys; German is du-form", () => {
    const flat = (o: Record<string, unknown>, pre = ""): string[] =>
      Object.entries(o)
        .filter(([k]) => !k.startsWith("_")) // `_pending_review`: the i18n bot's review metadata
        .flatMap(([k, v]) => (v && typeof v === "object" ? flat(v as Record<string, unknown>, `${pre}${k}.`) : [`${pre}${k}`]));
    const de = JSON.parse(read("i18n/de/memoryLearning.json")).memoryLearning;
    const en = JSON.parse(read("i18n/en/memoryLearning.json")).memoryLearning;
    expect(flat(en).sort()).toEqual(flat(de).sort());
    const deText = JSON.stringify(de) + JSON.stringify(JSON.parse(read("i18n/de/timeline.json")).timeline.insight);
    expect(deText).not.toMatch(/\b(Sie|Ihr|Ihnen)\b/);
  });
});
