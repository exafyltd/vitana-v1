/**
 * VTID-04470 — the profile must never invent a Vitana Index ranking.
 *
 * There is no community percentile/rank for the Index. Profile surfaces used
 * to fill `vitanaPercentile` with the score's share of the 999 maximum, which
 * rendered as "Top 12%" on mobile and "TOP 87%" on the desktop ID card for
 * the same score of 125 — two different fabricated ranks, neither real.
 *
 * This guard fails the build if any profile page or profile component gives
 * `vitanaPercentile` a value. The only permitted forms are leaving it unset
 * (`undefined`) and passing an existing value through unchanged
 * (`x.vitanaPercentile`). Wiring in a real ranking later means updating
 * ALLOWED below on purpose, next to this explanation.
 */
import { describe, it, expect } from "vitest";

const PROFILE_FILES = /[\\/](pages[\\/](Profile|EditProfilePage|PublicProfilePage)\.tsx|components[\\/]profile[\\/].+\.tsx?)$/;
// `vitanaPercentile: <rhs>`, `vitanaPercentile = <rhs>`, `vitanaPercentile={<rhs>}`
const ASSIGNMENT = /vitanaPercentile\s*(?::|=(?!=)|=\{)\s*([^,\n}]+)/g;
const ALLOWED = /^\{?\s*(undefined|vitanaPercentile|[\w.?]+\.vitanaPercentile)\s*\}?$/;

describe("profile surfaces never fabricate a Vitana Index percentile", () => {
  it("finds no assignment of vitanaPercentile derived from the score", async () => {
    const { readdirSync, readFileSync, statSync } = await import("fs");
    const { join } = await import("path");

    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          if (entry === "node_modules" || entry.startsWith(".")) continue;
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry) || entry.includes(".test.")) continue;
        if (!PROFILE_FILES.test(full)) continue;

        const src = readFileSync(full, "utf8");
        for (const m of src.matchAll(ASSIGNMENT)) {
          const rhs = m[1].trim();
          if (/^number\b/.test(rhs)) continue; // a type annotation, not a value
          if (!ALLOWED.test(rhs)) offenders.push(`${full}: ${m[0].trim()}`);
        }
      }
    };
    walk("src");

    expect(offenders).toEqual([]);
  });

  it("the pattern catches the shapes that shipped before (self-test)", () => {
    const shipped = [
      "vitanaPercentile: liveVitanaPercentile,",
      "vitanaPercentile: vitanaScore ? Math.min(99, Math.floor((vitanaScore / 999) * 100)) : undefined,",
      "profile.vitanaPercentile = 100 - getVitanaIndexPercentage(profile.vitanaIndex);",
      "vitanaPercentile = 15,",
    ];
    for (const line of shipped) {
      const rhs = [...line.matchAll(ASSIGNMENT)][0]?.[1]?.trim() ?? "";
      expect(ALLOWED.test(rhs), line).toBe(false);
    }
    for (const ok of ["vitanaPercentile: undefined,", "vitanaPercentile={profile.vitanaPercentile}"]) {
      const rhs = [...ok.matchAll(ASSIGNMENT)][0]?.[1]?.trim() ?? "";
      expect(ALLOWED.test(rhs), ok).toBe(true);
    }
  });
});
