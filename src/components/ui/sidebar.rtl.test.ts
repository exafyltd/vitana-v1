/**
 * VTID-03878 — the sidebar must lay out from the writing direction, not from physical sides.
 *
 * The defect this guards: the fixed panel was pinned with `left-0` while its layout spacer
 * follows the flex container's direction. Measured at 1400x900 on /backoffice/sales/followups
 * before the fix, with dir="rtl": panel x=0..256, spacer x=1144..1400, main x=0..1144 — the
 * content column started underneath the sidebar and 256px of it was unclickable. After:
 * panel x=1144..1400, on its spacer, main x=0..1144. LTR was identical either way.
 *
 * A layout measurement needs a browser, so this pins the cause instead: no physical-direction
 * utility may return to the file. `ltr:`/`rtl:`-prefixed ones are explicit and allowed.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// vitest serves this module over a dev-server URL, so resolve from the project root instead.
const SRC = readFileSync(resolve(process.cwd(), "src/components/ui/sidebar.tsx"), "utf8");

/** Physical utilities that have a logical twin: inset, border side, text alignment, padding. */
const PHYSICAL = [
  /(?<![\w:-])-?(left|right)-(0|1|2|3|4|full|1\/2|px|\[)/g,
  /(?<![\w:-])border-(l|r)(?![\w-])/g,
  /(?<![\w:-])text-(left|right)(?![\w-])/g,
  /(?<![\w:-])(pl|pr|ml|mr)-\d/g,
];

describe("sidebar direction", () => {
  it("uses logical properties, so the panel follows dir instead of a physical side", () => {
    const found: string[] = [];
    for (const re of PHYSICAL) {
      for (const m of SRC.matchAll(re)) {
        // An `ltr:`/`rtl:`-prefixed utility is a deliberate per-direction override, not a bug.
        const before = SRC.slice(Math.max(0, m.index - 4), m.index);
        if (/(ltr|rtl):$/.test(before)) continue;
        found.push(m[0]);
      }
    }
    expect(found).toEqual([]);
  });

  it("pins the fixed panel and its border to the inline axis", () => {
    expect(SRC).toContain('"start-0 group-data-[collapsible=offcanvas]:start-[calc(var(--sidebar-width)*-1)]"');
    expect(SRC).toContain('"end-0 group-data-[collapsible=offcanvas]:end-[calc(var(--sidebar-width)*-1)]"');
    expect(SRC).toContain("group-data-[side=left]:border-e group-data-[side=right]:border-s");
    // and the transition has to name the logical properties, or the panel jumps instead of sliding
    expect(SRC).toContain("transition-[inset-inline-start,inset-inline-end,width]");
  });
});
