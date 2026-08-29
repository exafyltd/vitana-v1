/**
 * Intro-screen Orb placement contract.
 *
 * The Orb on `/_intro/:tenantSlug` is rendered by the gateway's orb-widget.js
 * OUTSIDE this app's React tree, so it cannot be a child of the layout it has
 * to sit inside. It is positioned by a global CSS override that reads
 * `--maxina-orb-target-left/-top`, two custom properties IntroExperience.tsx
 * publishes from the measured centre of a reserved in-flow spacer.
 *
 * That measured approach was introduced before this suite and COULD NOT RUN:
 * the effect's dependency array was `[]` and it reads a ref that is null
 * behind the component's `!videoSrc` loading early-return, so it bailed once
 * and never re-ran. Neither property was ever set, the CSS fell through to
 * its `top: 50%` fallback, and in Serbian — whose headline wraps to three
 * lines — that landed the Orb on the italic sub-tagline. Measured on staging
 * at 50.4% of the viewport.
 *
 * These are source-level assertions, matching the pattern the ORB widget
 * suites use: the moving parts live in a global stylesheet and an external
 * script, and cannot be exercised through a component render. The companion
 * browser check that measures the real result is
 * `scripts/verify-intro-orb-placement.mjs`.
 *
 * What each case defends:
 *  - the effect can actually fire (the `[]`-deps bug above),
 *  - it re-fires when the copy changes, since a longer translation moves the
 *    spacer without resizing it, so the ResizeObserver alone never sees it,
 *  - the reserved height stays DERIVED from the Orb size rather than
 *    hand-tuned, so the two cannot drift into asymmetry,
 *  - the Orb is never rendered smaller than the widget's own base size,
 *  - a static percentage never comes back as the live value.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const TSX = readFileSync(join(ROOT, 'src/pages/IntroExperience.tsx'), 'utf8');
const CSS_RAW = readFileSync(join(ROOT, 'src/index.css'), 'utf8');
/** Comments explain the OLD behaviour by quoting it; only declarations count. */
const CSS = CSS_RAW.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * The widget's own base sizes (orb-widget.js): 64px, 56px under 600px wide.
 *
 * BOOTSTRAP-ORB-WIDGET-CONSISTENCY-AUDIT: these two numbers are duplicated
 * from exafyltd/vitana-platform's `services/gateway/src/frontend/command-hub/
 * orb-widget.js` (`.vtorb-fab` width/height, and its `@media (max-width:
 * 600px)` override). No CI run spans both repos, so nothing here would catch
 * that file's values drifting — that repo carries the mirror-image guard
 * (`services/gateway/test/orb/orb-widget-fab-size-cross-repo-parity.test.ts`)
 * pinning the SAME numbers from its side, with a comment pointing back here.
 * If you change either side, update both.
 */
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
    expect(TSX).toMatch(/ref=\{orbSpacerRef\}/);
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
    expect(CSS).toContain('var(--maxina-orb-target-top');
    // A percentage may survive ONLY as the var() fallback for the frame
    // before the first measurement. A bare `top: <n>%` on these selectors is
    // the original bug returning.
    const bare = [...CSS.matchAll(/top:\s*\d+%/g)].filter((m) => {
      const before = CSS.slice(Math.max(0, m.index! - 70), m.index!);
      return !before.includes('var(--maxina-orb-target-top');
    });
    expect(bare).toHaveLength(0);
  });

  it('re-measures when the component actually mounts its tree', () => {
    // IntroExperience returns a bare loader until `videoSrc` resolves, so on
    // the first pass the slot is not in the DOM and the ref is null. Without
    // `videoSrc` in the deps the effect never runs again and the property is
    // never published — measured, not assumed: this is the bug that shipped
    // during development and was caught by the browser check.
    const deps = TSX.match(/\}, \[videoSrc[^\]]*\]\);/);
    expect(deps, 'orb-placement effect dependency array not found').not.toBeNull();
    expect(deps![0]).toContain('videoSrc');
  });

  it('re-measures on language change', () => {
    // A language switch re-wraps the headline and moves the slot. These are
    // the strings whose change signals that.
    const deps = TSX.match(/\}, \[videoSrc[^\]]*\]\);/)![0];
    expect(deps).toContain('taglineMain');
    expect(deps).toContain('taglineSub');
    expect(deps).toContain('tapOrbHint');
  });

  it('re-measures on resize, orientation change and webfont load', () => {
    expect(TSX).toContain("window.addEventListener('resize', syncOrbTarget)");
    expect(TSX).toContain("window.addEventListener('orientationchange', syncOrbTarget)");
    expect(TSX).toContain('document.fonts.ready');
    expect(TSX).toContain('ResizeObserver');
  });

  it('never publishes a zero-height measurement', () => {
    // A zero rect means "not laid out yet"; publishing it would fling the orb
    // to the top edge of the screen.
    expect(TSX).toMatch(/if \(rect\.width === 0 && rect\.height === 0\) return;/);
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
