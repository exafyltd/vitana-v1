import { describe, it, expect } from "vitest";
import { deriveIndexHighlights, MIN_PILLAR_GAIN } from "./vitana-index-highlights";

const pillars = { nutrition: 30, hydration: 20, exercise: 40, sleep: 25, mental: 15 };

describe("deriveIndexHighlights (VTID-04470)", () => {
  it("returns none for null / zero / NaN totals", () => {
    expect(deriveIndexHighlights(null).kind).toBe("none");
    expect(deriveIndexHighlights({ total: 0, history: [] }).kind).toBe("none");
    expect(deriveIndexHighlights({ total: Number.NaN, history: [] }).kind).toBe("none");
  });

  it("names the pillars that actually rose, largest first, max 3", () => {
    const h = deriveIndexHighlights({
      total: 122,
      history: [{ date: "d1", score: 100 }, { date: "d7", score: 122 }],
      trend: "up",
      pillars,
      pillarHistory: [
        { date: "d1", pillars: { nutrition: 20, hydration: 19, exercise: 25, sleep: 20, mental: 10 } },
        { date: "d7", pillars: { nutrition: 30, hydration: 20, exercise: 40, sleep: 25, mental: 15 } },
      ],
    });
    expect(h.kind).toBe("boost");
    expect(h.lifts.map((l) => l.pillar)).toEqual(["exercise", "nutrition", "sleep"]);
    // hydration +1 is below the threshold and is never claimed.
    expect(h.lifts.find((l) => l.pillar === "hydration")).toBeUndefined();
    expect(h.weekDelta).toBe(22);
    expect(h.momentum).toBe("rising_fast");
  });

  it("ignores gains below the threshold", () => {
    const h = deriveIndexHighlights({
      total: 100,
      history: [{ date: "a", score: 99 }, { date: "b", score: 100 }],
      pillars,
      pillarHistory: [
        { date: "a", pillars: { exercise: 40 } },
        { date: "b", pillars: { exercise: 40 + MIN_PILLAR_GAIN - 1 } },
      ],
    });
    expect(h.kind).toBe("strongest");
    expect(h.strongest).toBe("exercise");
    expect(h.momentum).toBeNull();
  });

  it("does not name a strongest area for baseline or all-equal pillars", () => {
    expect(
      deriveIndexHighlights({ total: 50, history: [], pillars, isBaseline: true }).kind,
    ).toBe("none");
    expect(
      deriveIndexHighlights({
        total: 50,
        history: [],
        pillars: { nutrition: 10, hydration: 10, exercise: 10, sleep: 10, mental: 10 },
      }).kind,
    ).toBe("none");
  });

  it("reports improving only when history and trend agree", () => {
    const h = deriveIndexHighlights({
      total: 110,
      history: [{ date: "a", score: 100 }, { date: "b", score: 110 }],
      trend: "up",
    });
    expect(h.momentum).toBe("improving");
    const flat = deriveIndexHighlights({
      total: 110,
      history: [{ date: "a", score: 100 }, { date: "b", score: 110 }],
      trend: "stable",
    });
    expect(flat.momentum).toBeNull();
  });

  it("never emits a percentile or rank field", () => {
    const h = deriveIndexHighlights({ total: 122, history: [], pillars });
    expect(Object.keys(h)).not.toContain("percentile");
    expect(Object.keys(h)).not.toContain("rank");
  });
});
