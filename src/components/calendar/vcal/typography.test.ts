/**
 * VTID-04812 — the calendar looks like the rest of the app.
 *
 * It uses the app's own font and the standard Tailwind text scale and weights
 * that News, Postfach and Reise use. A separate font, a pixel size outside the
 * scale, or a weight the other screens never use fails the build. (The app
 * icons in ProviderLogos copy the real icons and are exempt.)
 */
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { providerAddUrl } from "./SubscribeSheet";

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
      expect(src, "a pixel size outside the Tailwind text scale").not.toMatch(/text-\[\d+(\.\d+)?px\]/);
      expect(src, "inline font size or weight").not.toMatch(/fontSize\s*:|fontWeight\s*:/);
      expect(src, "a weight the other screens do not use").not.toMatch(/\bfont-(thin|extralight|light|extrabold|black)\b/);
    });
  }

  it("the page title is the app's standard header: text-lg font-bold tracking-tight", () => {
    const page = fs.readFileSync(path.resolve(DIR, "../../../pages/Calendar.tsx"), "utf8");
    expect(page).toMatch(/text-lg font-bold[^"]*tracking-tight/);
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
