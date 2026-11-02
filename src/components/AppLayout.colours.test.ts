/**
 * desktop-spotlight-finish / colours-batch-2 (VTID-05286 fix-forward) — the app
 * chrome in AppLayout carries only semantic tokens. STAGING-VERIFY run
 * 41329713260 failed on /comm, /comm/groups, /comm/live-rooms and
 * /sharing/campaigns with "raw palette class … lucide-shield h-3 w-3
 * text-slate-400": the leak was this file's tenant-name Shield icon, not a
 * screen of the batch. The sidebar avatar fallback (pink gradient) leaked the
 * same way. AppLayout needs the whole session/tenant stack to render, so this
 * reads the source and checks the className strings directly.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(__dirname, "AppLayout.tsx"), "utf8");

// Same palette families and properties as the staging spec's RAW_PALETTE_SRC.
const RAW_PALETTE =
  /(?:^|[\s"'`:])(?:bg|text|border|ring|from|via|to|fill|stroke|divide|shadow|outline|decoration|accent|caret|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/\d+)?(?=[\s"'`]|$)/g;

describe("colours-batch-2 › AppLayout chrome", () => {
  it("renders the exafy-admin Shield icon with text-muted-foreground", () => {
    expect(src).toContain('<Shield className="h-3 w-3 text-muted-foreground" />');
  });

  it("gives the sidebar avatar fallback the category-4 token (both open and collapsed)", () => {
    const fallbacks = src.match(/<AvatarFallback className="[^"]*"/g) ?? [];
    expect(fallbacks).toHaveLength(2);
    for (const f of fallbacks) expect(f).toContain("from-category-4/15 to-category-4/25 text-category-4");
  });

  it("has no raw Tailwind palette class anywhere in the file", () => {
    expect(src.match(RAW_PALETTE) ?? []).toEqual([]);
  });

  it("colours the sidebar quick-action icons with text-sidebar-foreground, not raw text-white", () => {
    expect(src).not.toMatch(/(?:^|[\s"'`:])text-white(?=[\s"'`/]|$)/m);
    expect(src.match(/text-sidebar-foreground/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
  });
});
