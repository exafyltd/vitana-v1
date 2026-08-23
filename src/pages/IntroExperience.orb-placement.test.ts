/**
 * Intro-screen Orb placement contract.
 *
 * The Orb on `/_intro/:tenantSlug` is rendered by the gateway's orb-widget.js
 * OUTSIDE this app's React tree, so it cannot be a child of the layout it has
 * to sit inside. It used to be parked at a hardcoded `top: 58%` of the
 * viewport — a guess about where the copy ends. The copy ends somewhere
 * different in every language, and in Serbian the orb landed directly on top
 * of the italic sub-tagline.
 *
 * The fix couples the orb to the layout instead of to a percentage:
 * `IntroExperience.tsx` reserves a real in-flow slot and publishes its measured
 * centre as `--maxina-orb-top`. These are source-level assertions on that
 * contract — the same pattern the ORB widget suites use, because the pieces
 * live in a global stylesheet and an external script and cannot be exercised
 * through a component render.
 *
 * Two of these pin bugs that actually happened during this work:
 *  - the effect's dependency list omitted `videoSrc`, so it ran once while the
 *    component was still showing its loader, found a null ref, bailed, and
 *    never re-ran — the custom property was never published and the orb kept
 *    the fallback forever. Wired-looking and unable to fire.
 *  - a bare `top: 58%` as the live value is the original defect; it survives
 *    only as the `var()` fallback for the frame before first measurement.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const TSX = readFileSync(join(ROOT, 'src/pages/IntroExperience.tsx'), 'utf8');
const CSS_RAW = readFileSync(join(ROOT, 'src/index.css'), 'utf8');
/** Comments explain the OLD behaviour by quoting it; only declarations count. */
const CSS = CSS_RAW.replace(/\/\*[\s\S]*?\*\//g, '');

/** The widget's own base sizes (orb-widget.js): 64px, 56px under 600px wide. */
const WIDGET_BASE_DESKTOP = 64;
const WIDGET_BASE_MOBILE = 56;

/** Read a px-valued custom property from the LAST block that declares it. */
function lastPxVar(css: string, name: string): number | null {
  const matches = [...css.matchAll(new RegExp(`--${name}\\s*:\\s*(\\d+)px`, 'g'))];
  if (matches.length === 0) return null;
  return Number(matches[matches.length - 1][1]);
}
function allPxVars(css: string, name: string): number[] {
  return [...css.matchAll(new RegExp(`--${name}\\s*:\\s*(\\d+)px`, 'g'))].map((m) => Number(m[1]));
}

describe('intro Orb placement', () => {
  it('reserves a real in-flow slot for the orb', () => {
    // Without the slot there is nothing to measure and nothing holding the
    // space open, so the orb is back to overlapping whatever is at 58%.
    expect(TSX).toContain('maxina-orb-slot');
    expect(TSX).toMatch(/ref=\{orbSlotRef\}/);
    expect(CSS).toContain('.maxina-orb-slot');
  });

  it('derives the slot height from the orb size rather than hardcoding it', () => {
    // If the reserved height and the rendered orb are set independently they
    // will drift, and the drift shows up as asymmetric spacing.
    expect(CSS).toMatch(
      /--maxina-orb-slot:\s*calc\(\s*var\(--maxina-orb-size\)\s*\+\s*2\s*\*\s*var\(--maxina-orb-gap\)\s*\)/,
    );
    expect(CSS).toMatch(/\.maxina-orb-slot\s*\{[^}]*height:\s*var\(--maxina-orb-slot\)/);
  });

  it('positions the orb from the measured slot, not a viewport percentage', () => {
    expect(CSS).toContain('var(--maxina-orb-top');
    // 58% may survive ONLY as the var() fallback for the pre-measurement frame.
    // A bare `top: 58%` anywhere is the original bug returning.
    const bareFiftyEight = [...CSS.matchAll(/top:\s*58%/g)].filter((m) => {
      const before = CSS.slice(Math.max(0, m.index! - 60), m.index!);
      return !before.includes('var(--maxina-orb-top');
    });
    expect(bareFiftyEight).toHaveLength(0);
  });

  it('re-measures when the component actually mounts its tree', () => {
    // IntroExperience returns a bare loader until `videoSrc` resolves, so on
    // the first pass the slot is not in the DOM and the ref is null. Without
    // `videoSrc` in the deps the effect never runs again and the property is
    // never published — measured, not assumed: this is the bug that shipped
    // during development and was caught by the browser check.
    const deps = TSX.match(/\}, \[taglineMain[^\]]*\]\);/);
    expect(deps, 'orb-placement effect dependency array not found').not.toBeNull();
    expect(deps![0]).toContain('videoSrc');
  });

  it('re-measures on language change', () => {
    // A language switch re-wraps the headline and moves the slot. These are
    // the strings whose change signals that.
    const deps = TSX.match(/\}, \[taglineMain[^\]]*\]\);/)![0];
    expect(deps).toContain('taglineMain');
    expect(deps).toContain('taglineSub');
    expect(deps).toContain('tapOrbHint');
  });

  it('re-measures on resize, orientation change and webfont load', () => {
    expect(TSX).toContain("window.addEventListener('resize', apply)");
    expect(TSX).toContain("window.addEventListener('orientationchange', apply)");
    expect(TSX).toContain('document.fonts.ready');
    expect(TSX).toContain('ResizeObserver');
  });

  it('never publishes a zero-height measurement', () => {
    // A zero rect means "not laid out yet"; publishing it would fling the orb
    // to the top edge of the screen.
    expect(TSX).toMatch(/if \(rect\.height === 0\) return;/);
  });

  it('never renders the orb smaller than the widget’s own base size', () => {
    const sizes = allPxVars(CSS, 'maxina-orb-size');
    expect(sizes.length, 'no --maxina-orb-size declarations found').toBeGreaterThanOrEqual(2);
    // The mobile override is the smaller of the two and still has to clear the
    // widget's 56px mobile base; the desktop value has to clear 64px.
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(WIDGET_BASE_MOBILE);
    expect(Math.max(...sizes)).toBeGreaterThanOrEqual(WIDGET_BASE_DESKTOP);
  });

  it('keeps the sub-tagline and the caption flush against the slot', () => {
    // Symmetry is a property of the slot: gap / orb / gap. A margin on either
    // neighbour lands on one side only and breaks it. `mb-10` on the
    // sub-tagline is specifically what used to be there.
    // Anchor on the element that actually renders `taglineSub` — several
    // elements on this screen share `italic tracking-wide`, including the
    // "Experience" line high in the brand block, whose own margin is fine.
    // `lastIndexOf`, not `indexOf`: the first mention is the `const taglineSub`
    // the effect depends on, not the JSX that renders it.
    const subIdx = TSX.lastIndexOf('t.intro?.taglineSub');
    expect(subIdx, 'taglineSub not rendered').toBeGreaterThan(-1);
    const openingTag = TSX.lastIndexOf('<p', subIdx);
    const subTagline = TSX.slice(openingTag, subIdx);
    expect(subTagline).toContain('italic');
    expect(subTagline).not.toMatch(/\bmb-\d/);
  });

  it('declares a gap that is actually visible', () => {
    const gap = lastPxVar(CSS, 'maxina-orb-gap');
    expect(gap).not.toBeNull();
    expect(gap!).toBeGreaterThanOrEqual(16);
  });
});
