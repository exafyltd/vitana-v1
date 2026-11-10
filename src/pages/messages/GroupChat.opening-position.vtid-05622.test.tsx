/**
 * VTID-05622 — the group chat list must not paint before its opening position
 * is set. Previously the list was visible from its first paint at the top and
 * then scrolled to the newest message, which members saw as a scroll.
 *
 * jsdom has no layout, so this pins the mechanism in the source: both list
 * containers are hidden until the first bottom pin has run, and the flag is
 * set only after that pin.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(__dirname, "GroupChat.tsx"), "utf8");

describe("GroupChat opening position (VTID-05622)", () => {
  it("tracks a positioned flag, reset per group or target", () => {
    expect(src).toMatch(/const \[positioned, setPositioned\] = useState\(false\)/);
    expect(src).toMatch(/pinnedRef\.current = true;\s*\n\s*setPositioned\(false\);/);
  });

  it("sets positioned right after the first bottom pin is applied", () => {
    expect(src).toMatch(/applyPin\(\);\s*\n\s*setPositioned\(true\);/);
  });

  it("hides both list containers until positioned", () => {
    const hidden = /positioned \? \{\} : \{ visibility: "hidden" as const \}/g;
    expect((src.match(hidden) ?? []).length).toBe(2);
  });

  // VTID-05670: the sticky composer covers the bottom of the list; both lists
  // get the measured composer height as bottom padding.
  it("reserves the composer height at the bottom of both lists (VTID-05670)", () => {
    expect(src).toMatch(/const \[footerH, setFooterH\] = useState\(0\)/);
    expect((src.match(/paddingBottom: footerH \+ 16/g) ?? []).length).toBe(2);
    expect((src.match(/ref=\{footerRef\}/g) ?? []).length).toBe(2);
    expect(src).toMatch(/className="sticky bottom-0 border-t bg-card px-2 pt-2"/);
  });
});
