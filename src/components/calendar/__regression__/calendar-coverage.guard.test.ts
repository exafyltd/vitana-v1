/**
 * VTID-04459 — app calendar regression suite: nothing calendar ships untested.
 *
 * Fails when:
 *   - a calendar file appears (anything under src/components/calendar/, a
 *     src/lib or src/hooks file with "calendar" in its name, or the
 *     /calendar page) without an entry in manifest.json;
 *   - a listed test is gone or no longer references the file it covers;
 *   - a file is parked in `uncovered` that was not there when the suite was
 *     built (new calendar code needs a test, not a parking spot);
 *   - a calendar text key is missing, or has different {placeholders}, in
 *     any of the 11 languages;
 *   - the CALENDAR-REGRESSION workflow or the test:calendar script stop
 *     running this suite.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "src/components/calendar/__regression__/manifest.json"), "utf8")) as {
  sources: Record<string, string[]>;
  uncovered: string[];
};

/** The older calendar UI that had no tests when this suite was built. This list may only shrink. */
const ALLOWED_UNCOVERED = new Set([
  "AutopilotCalendarSuggestions", "AutopilotTaskGroup", "BookedVitanaEventsSection", "CalendarFilters", "CalendarSkeleton",
  "EnhancedCalendarPopup", "EventDetailsPanel", "EventPillarDot", "JourneyProgressStrip", "MobileCalendarModal",
  "MobileEventForm", "NaturalLanguageInput", "OnboardingPlanCard", "SmartEventCard", "TodayFocusStrip", "WeekGridView",
].map((n) => `src/components/calendar/${n}.tsx`));

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}
const rel = (p: string) => path.relative(ROOT, p).split(path.sep).join("/");
const isSource = (p: string) => /\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p) && !p.includes("/__regression__/");

const discovered = [
  ...walk(path.join(ROOT, "src/components/calendar")),
  ...walk(path.join(ROOT, "src/lib")).filter((p) => /calendar/i.test(path.basename(p))),
  ...walk(path.join(ROOT, "src/hooks")).filter((p) => /calendar/i.test(path.basename(p))),
  path.join(ROOT, "src/pages/Calendar.tsx"),
]
  .map(rel)
  .filter(isSource)
  .sort();

describe("calendar coverage manifest", () => {
  it("lists every calendar source file", () => {
    const known = new Set([...Object.keys(manifest.sources), ...manifest.uncovered]);
    const missing = discovered.filter((f) => !known.has(f));
    if (missing.length) {
      throw new Error(`Calendar files with no manifest entry (add them to src/components/calendar/__regression__/manifest.json with the tests that cover them):\n  ${missing.join("\n  ")}`);
    }
  });

  it("lists no file that is gone", () => {
    const all = [...Object.keys(manifest.sources), ...manifest.uncovered];
    expect(all.filter((f) => !fs.existsSync(path.join(ROOT, f)))).toEqual([]);
  });

  it("only the pre-existing older calendar UI may be uncovered", () => {
    expect(manifest.uncovered.filter((f) => !ALLOWED_UNCOVERED.has(f))).toEqual([]);
  });

  it.each(Object.entries(manifest.sources))("%s is referenced by each listed test", (src, tests) => {
    expect(tests.length).toBeGreaterThan(0);
    const base = path.basename(src).replace(/\.tsx?$/, "");
    const re = new RegExp(`['"\`][^'"\`]*${base.replace(/[-.]/g, (c) => `\\${c}`)}(\\.tsx?)?['"\`]`);
    for (const t of tests) {
      const file = path.join(ROOT, t);
      if (!fs.existsSync(file)) throw new Error(`${src}: listed test ${t} does not exist`);
      if (!re.test(fs.readFileSync(file, "utf8"))) throw new Error(`${src}: ${t} no longer references ${base}`);
    }
  });
});

describe("calendar text in every language", () => {
  const LOCALES = ["de", "en", "es", "sr", "ar", "fr", "pt", "ru", "zh", "pl", "tr"];
  const flat = (o: Record<string, unknown>, pre = ""): Record<string, string> =>
    Object.entries(o).reduce<Record<string, string>>((acc, [k, v]) => {
      if (k.startsWith("_")) return acc;
      if (v && typeof v === "object") Object.assign(acc, flat(v as Record<string, unknown>, `${pre}${k}.`));
      else acc[`${pre}${k}`] = String(v);
      return acc;
    }, {});
  const load = (loc: string) => flat(JSON.parse(fs.readFileSync(path.join(ROOT, `src/i18n/${loc}/vcal.json`), "utf8")));
  const de = load("de");
  const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

  it.each(LOCALES)("%s has every calendar key with the same placeholders", (loc) => {
    const cat = load(loc);
    const missing = Object.keys(de).filter((k) => !(k in cat) || !cat[k].trim());
    const wrong = Object.keys(de).filter((k) => k in cat && params(cat[k]) !== params(de[k]));
    expect({ missing, wrong }).toEqual({ missing: [], wrong: [] });
  });

  it("every vcal key the calendar code uses exists", () => {
    const files = Object.keys(manifest.sources).filter((f) => /vcal\/|pages\/Calendar/.test(f));
    const used = new Set<string>();
    for (const f of files) {
      for (const m of fs.readFileSync(path.join(ROOT, f), "utf8").matchAll(/["'`](vcal\.[a-zA-Z0-9_.]+)["'`]/g)) used.add(m[1]);
    }
    const missing = [...used].filter((k) => !(k in de) && !Object.keys(de).some((d) => d.startsWith(`${k}.`)));
    expect(missing).toEqual([]);
  });
});

describe("wiring", () => {
  it("test:calendar and CALENDAR-REGRESSION run this suite and every listed test", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    const script: string = pkg.scripts["test:calendar"];
    expect(script).toContain("src/components/calendar/__regression__");
    for (const t of new Set(Object.values(manifest.sources).flat())) {
      if (t.includes("/__regression__/")) continue;
      expect(script).toContain(t);
    }
    const wf = fs.readFileSync(path.join(ROOT, ".github/workflows/CALENDAR-REGRESSION.yml"), "utf8");
    expect(wf).toContain("npm run test:calendar");
    for (const p of ["src/components/calendar/**", "src/pages/Calendar.tsx", "src/lib/*alendar*", "src/i18n/*/vcal.json"]) expect(wf).toContain(p);
  });
});
