/**
 * VTID-04681 — the calendar uses two font weights: normal and medium.
 *
 * The first redesign set almost every label in bold or extra-bold, so nothing
 * stood out. This fails the build if a heavier weight comes back into any
 * calendar screen.
 */
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { providerAddUrl } from "./SubscribeSheet";

const DIR = __dirname;
const FILES = [
  ...fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
    .map((f) => path.join(DIR, f)),
  path.resolve(DIR, "../../../pages/Calendar.tsx"),
  path.resolve(DIR, "../MobileEventForm.tsx"),
];

describe("calendar typography", () => {
  it("covers the calendar screens", () => {
    expect(FILES.length).toBeGreaterThan(8);
  });

  for (const file of FILES) {
    it(`${path.basename(file)} uses no bold, extra-bold or semibold`, () => {
      const src = fs.readFileSync(file, "utf8");
      expect(src).not.toMatch(/\bfont-(bold|extrabold|semibold|black)\b/);
      for (const m of src.matchAll(/fontWeight:\s*(\d+)/g)) expect(Number(m[1])).toBeLessThanOrEqual(500);
    });
  }
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
