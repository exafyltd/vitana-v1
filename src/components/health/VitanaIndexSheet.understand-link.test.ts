/**
 * VTID-04850 — the "Your Index" drawer links to the full Index page
 * (/health/vitana-index), like the profile card's "Understand index".
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(resolve(process.cwd(), "src/components/health/VitanaIndexSheet.tsx"), "utf8");

describe("VitanaIndexSheet › Understand index link", () => {
  it("renders the link under the pillars, with the profile card's label", () => {
    const today = src.slice(src.indexOf("Section 1: Today"), src.indexOf("Section 2: Next few days"));
    expect(today).toContain('data-testid="vitana-index-sheet-understand"');
    expect(today).toContain('t("profile.identity.understandIndex")');
    expect(today).toContain("onClick={handleUnderstandIndex}");
  });

  it("closes the drawer and opens the Index page", () => {
    const fn = src.slice(src.indexOf("const handleUnderstandIndex"), src.indexOf("const handleOpenAutopilot"));
    expect(fn).toContain("setOpen(false);");
    expect(fn).toContain('navigate("/health/vitana-index");');
  });

  it("the label exists in German and English", () => {
    for (const loc of ["de", "en"]) {
      const json = JSON.parse(readFileSync(resolve(process.cwd(), `src/i18n/${loc}/profile.json`), "utf8"));
      expect(typeof json.profile.identity.understandIndex).toBe("string");
    }
  });
});
