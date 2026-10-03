/**
 * VTID-04773 — the "Let's improve your health" steps on /health/vitana-index
 * (the profile's "Understand index"), plus source checks for the copy and
 * destinations a member relies on: blood test upload, tracker connection.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { buildNextSteps, goalProgress, hasConnectedData } from "./vitana-index-next-steps";
import type { VitanaIndexState } from "@/hooks/useVitanaIndex";
import { getVitanaIndexTier } from "@/lib/vitanaIndex";

const sub = (data = 0) => ({ baseline: 20, completions: 0, data, streak: 0 });

function makeIndex(over: Partial<VitanaIndexState> = {}): VitanaIndexState {
  return {
    total: 122,
    tier: getVitanaIndexTier(122),
    pillars: { nutrition: 30, hydration: 28, exercise: 25, sleep: 12, mental: 27 },
    subscores: { nutrition: sub(), hydration: sub(), exercise: sub(), sleep: sub(), mental: sub() },
    balanceFactor: 0.9,
    history: [],
    pillarHistory: [],
    trend: "stable",
    confidence: 0.5,
    isBaseline: true,
    lastUpdated: "2026-09-29",
    ...over,
  };
}

describe("buildNextSteps", () => {
  it("a new member is first sent to the blood test, then trackers, their weakest pillar, then the journey", () => {
    const steps = buildNextSteps(makeIndex(), { hasBloodPanel: false });
    expect(steps.map((s) => s.id)).toEqual(["blood", "devices", "focus", "journey"]);
    expect(steps.find((s) => s.id === "focus")?.pillar).toBe("sleep");
    expect(steps.every((s) => !s.done)).toBe(true);
  });

  it("finished one-time steps drop to the end with a check, so 'Next up' is always an open step", () => {
    const index = makeIndex({
      subscores: { nutrition: sub(), hydration: sub(), exercise: sub(5), sleep: sub(), mental: sub() },
    });
    const steps = buildNextSteps(index, { hasBloodPanel: true });
    expect(steps.map((s) => s.id)).toEqual(["focus", "journey", "blood", "devices"]);
    expect(steps.slice(2).every((s) => s.done)).toBe(true);
  });

  it("level pillars have no biggest lever: the focus step says so instead of naming a false weakest", () => {
    const level = makeIndex({ pillars: { nutrition: 25, hydration: 25, exercise: 25, sleep: 25, mental: 25 } });
    expect(buildNextSteps(level, { hasBloodPanel: false }).find((s) => s.id === "focus")?.even).toBe(true);
    expect(buildNextSteps(makeIndex(), { hasBloodPanel: false }).find((s) => s.id === "focus")?.even).toBe(false);
  });

  it("without an Index there is no pillar to focus on", () => {
    expect(buildNextSteps(null, { hasBloodPanel: false }).map((s) => s.id)).toEqual(["blood", "devices", "journey"]);
  });

  it("connected data counts only when a pillar earns data points", () => {
    expect(hasConnectedData(null)).toBe(false);
    expect(hasConnectedData(makeIndex())).toBe(false);
    expect(hasConnectedData(makeIndex({ subscores: null }))).toBe(false);
  });
});

describe("goalProgress", () => {
  it("climbs toward 600 first, then 800", () => {
    expect(goalProgress(122)).toEqual({ target: 600, remaining: 478, ratio: 122 / 600 });
    expect(goalProgress(650).target).toBe(800);
    expect(goalProgress(900)).toEqual({ target: 800, remaining: 0, ratio: 1 });
  });
});

describe("VitanaIndexDetail page (source check)", () => {
  const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
  const src = read("src/pages/health/VitanaIndexDetail.tsx");

  it("sends the member to the real destinations: blood panel upload, fitness connectors, journey", () => {
    expect(src).toContain('defaultCategory="blood_panel"');
    expect(src).toContain('navigate("/connectors?tab=fitness")');
    expect(src).toContain('navigate("/health/my-biology")');
    expect(src).toContain('navigate("/autopilot")');
    expect(src).toMatch(/"Apple Health", "Samsung Health"/);
  });

  it("re-renders when a lazily loaded language arrives (subscribes to the language context)", () => {
    expect(src).toContain('import { useTranslation } from "@/hooks/useTranslation";');
    expect(src).toMatch(/export default function VitanaIndexDetail\(\) \{[\s\S]{0,300}useTranslation\(\);/);
  });

  it("follows the profile card's design language and stays RTL-safe", () => {
    expect(src).toContain("rounded-3xl border border-slate-100 bg-white");
    expect(src).toContain("hsl(200, 80%, 91%)");
    expect(src).not.toMatch(/\b(ml|mr|pl|pr)-\d/);
    expect(src).not.toContain("toLocaleDateString");
  });

  it("every page string exists in German and English", () => {
    const de = JSON.parse(read("src/i18n/de/vitanaIndexPage.json")).vitanaIndexPage;
    const en = JSON.parse(read("src/i18n/en/vitanaIndexPage.json")).vitanaIndexPage;
    const keys = [...src.matchAll(/k\("([a-zA-Z.]+)"\)/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(30);
    const get = (o: Record<string, unknown>, path: string) =>
      path.split(".").reduce<unknown>((acc, p) => (acc as Record<string, unknown> | undefined)?.[p], o);
    for (const key of keys) {
      expect(typeof get(de, key), `de: ${key}`).toBe("string");
      expect(typeof get(en, key), `en: ${key}`).toBe("string");
    }
    for (const key of ["steps.focusBody", "steps.focusBodyEven"]) {
      expect(typeof get(de, key), `de: ${key}`).toBe("string");
      expect(typeof get(en, key), `en: ${key}`).toBe("string");
    }
    expect(src).toContain("maxVal > minVal ? keys[values.indexOf(minVal)]");
    expect(JSON.stringify(de)).not.toMatch(/\b(Sie|Ihr|Ihnen|Ihre)\b/);
  });
});
