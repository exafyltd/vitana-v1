/**
 * VTID-05719 — desktop sidebar: quiet nav groups, wordmark, dock footer.
 * Source-level checks, like AppLayout.colours.test.ts: AppLayout needs the whole
 * session and tenant stack to render, so this reads the file and the nav config.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { communityNavigation } from "@/config/role-navigation";

const src = readFileSync(resolve(__dirname, "AppLayout.tsx"), "utf8");

// Pull the COMMUNITY_NAV_GROUPS paths out of the source (group key -> paths).
function groupPaths(): string[] {
  const block = src.match(/const COMMUNITY_NAV_GROUPS[\s\S]*?\n\];/)?.[0] ?? "";
  return [...block.matchAll(/"(\/[^"]*)"/g)].map((m) => m[1]);
}

describe("VTID-05719 › desktop sidebar groups", () => {
  it("places every community nav item in exactly one group", () => {
    const grouped = groupPaths();
    const navPaths = communityNavigation.map((c) => c.path);
    for (const p of navPaths) {
      expect(grouped.filter((g) => g === p), `group membership of ${p}`).toHaveLength(1);
    }
    expect(grouped.sort()).toEqual([...navPaths].sort());
  });

  it("has the four agreed groups in order: Start, Connect, Grow, Account", () => {
    const keys = [...src.matchAll(/\{ key: "(\w+)", fallback: "(\w+)"/g)].map((m) => m[1]);
    expect(keys).toEqual(["start", "connect", "grow", "account"]);
  });

  it("renders section labels only for the community navigation", () => {
    expect(src).toMatch(/const isCommunityNav = !NON_COMMUNITY_PREFIXES/);
    expect(src).toMatch(/isCommunityNav \? COMMUNITY_NAV_GROUPS\.find/);
  });
});

describe("VTID-05719 › wordmark and footer", () => {
  it("shows the one-word wordmark Vitanaland, not the old VITANA", () => {
    expect(src).toContain('{open ? "Vitanaland" : "V"}');
    expect(src).not.toContain('"VITANA"');
  });

  it("keeps the ORB clearance as named constants (expanded and collapsed)", () => {
    expect(src).toContain('const ORB_CLEARANCE_EXPANDED = "h-24";');
    expect(src).toContain('const ORB_CLEARANCE_COLLAPSED = "h-16";');
    expect(src).toContain("className={open ? ORB_CLEARANCE_EXPANDED : ORB_CLEARANCE_COLLAPSED}");
  });

  it("puts profile, sound and language in one dock card on desktop only", () => {
    expect(src).toContain('className={open && !isMobile ? "rounded-xl bg-sidebar-accent/30 p-1 space-y-1" : undefined}');
    expect(src).toContain("<LanguageSidebarControl /></div>");
  });

  it("has no Start Stream entry anywhere in the sidebar", () => {
    expect(src).not.toMatch(/start stream/i);
  });
});
