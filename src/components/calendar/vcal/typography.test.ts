/**
 * VTID-04812 — the calendar looks like the rest of the app.
 * VTID-04852 — and like the Vitana Index page.
 *
 * It uses the app's own font and the Tailwind text scale and weights that
 * News, Postfach, Reise and the Index page use. A separate font, a pixel size
 * the Index page does not use, or a weight the other screens never use fails
 * the build. The only pixel size allowed is the Index page's body text: 15px. (The app icons in ProviderLogos copy the
 * real icons and are exempt.)
 */
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { INDEX_HERO_STYLE } from "@/lib/index-look";
import { providerAddUrl } from "./SubscribeSheet";
import { CALENDAR_NUMBER_STOPS, CALENDAR_NUMBER_STYLE, SURFACE } from "./theme";

const DIR = __dirname;
const FILES = [
  ...fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".tsx") && !f.includes(".test.") && f !== "ProviderLogos.tsx")
    .map((f) => path.join(DIR, f)),
  path.resolve(DIR, "../../../pages/Calendar.tsx"),
  path.resolve(DIR, "../MobileEventForm.tsx"),
];

describe("calendar typography", () => {
  it("covers the calendar screens", () => {
    expect(FILES.length).toBeGreaterThan(8);
  });

  for (const file of FILES) {
    it(`${path.basename(file)} uses the app's font, sizes and weights`, () => {
      const src = fs.readFileSync(file, "utf8");
      expect(src, "its own font family").not.toMatch(/fontFamily|font-\[|Nunito|fonts\.googleapis/);
      const pixelSizes = [...src.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].map((m) => m[1]);
      expect(pixelSizes.filter((px) => !["15"].includes(px)), "a pixel size the Index page does not use").toEqual([]);
      expect(src, "inline font size or weight").not.toMatch(/fontSize\s*:|fontWeight\s*:/);
      expect(src, "a weight the other screens do not use").not.toMatch(/\bfont-(thin|extralight|light|black)\b/);
    });
  }

  it("the page header is the Index page's hero: eyebrow and bold title, no big number (VTID-04952)", () => {
    const page = fs.readFileSync(path.resolve(DIR, "../../../pages/Calendar.tsx"), "utf8");
    expect(page).toContain("INDEX_HERO_CLASS");
    expect(page).toContain("INDEX_EYEBROW");
    expect(page).toMatch(/text-2xl font-bold/);
    // The Vitana Index keeps its teal-green number to itself.
    expect(page).not.toMatch(/INDEX_NUMBER_STYLE|INDEX_GLOW_STYLE|text-\[\d+px\]/);
    expect(page).toContain("CALENDAR_NUMBER_STYLE");
    expect(CALENDAR_NUMBER_STYLE.background).not.toMatch(/teal|152|168|180/);
  });

  it("the day number's colours stay readable on the hero card (WCAG 2.2 AA, large bold text >= 3:1)", () => {
    const channel = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const lum = ([r, g, b]: number[]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const hsl = (h: number, sPct: number, lPct: number) => {
      const s = sPct / 100;
      const l = lPct / 100;
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
      };
      return [f(0), f(8), f(4)];
    };
    const ratio = (a: number[], b: number[]) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const stops = [
      ...String(INDEX_HERO_STYLE.backgroundColor).matchAll(/hsl\((\d+), (\d+)%, (\d+)%\)/g),
      ...String(INDEX_HERO_STYLE.backgroundImage).matchAll(/hsl\((\d+), (\d+)%, (\d+)%\)/g),
    ].map((m) => hsl(Number(m[1]), Number(m[2]), Number(m[3])));
    expect(stops.length).toBe(4);
    for (const colour of CALENDAR_NUMBER_STOPS) {
      for (const bg of stops) expect(ratio(hex(colour), bg), `${colour} on the hero`).toBeGreaterThanOrEqual(3);
    }
    // Today in Week and Month: white on the violet circle, violet on white.
    expect(ratio([255, 255, 255], hex(SURFACE.today))).toBeGreaterThanOrEqual(4.5);
  });

  it("has no text or microphone bar — entries come from + and from Vitana by voice", () => {
    const page = fs.readFileSync(path.resolve(DIR, "../../../pages/Calendar.tsx"), "utf8");
    expect(page).not.toMatch(/vcal-voice-add|voiceAdd|🎙/);
    expect(page).toMatch(/data-testid="vcal-add"/);
  });
});

describe("adding Vitana to a calendar app by link (VTID-04682)", () => {
  const url = "https://preview-aws-gateway.vitanaland.com/api/v1/calendar/feed/abc.ics";

  it("Google gets the webcal link on its add-by-URL page", () => {
    expect(providerAddUrl("google", url)).toBe(
      "https://calendar.google.com/calendar/render?cid=" + encodeURIComponent("webcal://preview-aws-gateway.vitanaland.com/api/v1/calendar/feed/abc.ics"),
    );
  });

  it("Outlook gets the https link on its add-from-web page", () => {
    expect(providerAddUrl("outlook", url)).toBe(`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(url)}&name=Vitana`);
  });

  it("Apple opens the webcal link directly", () => {
    expect(providerAddUrl("apple", url)).toBe("webcal://preview-aws-gateway.vitanaland.com/api/v1/calendar/feed/abc.ics");
  });
});
