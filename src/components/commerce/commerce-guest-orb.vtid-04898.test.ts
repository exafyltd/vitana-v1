// VTID-04898 — the pre-login Commerce page keeps the Vitana orb off its content
// at desktop widths. The geometry is proven on staging
// (tests/e2e/staging/vtid-04898-commerce-guest-orb.staging.spec.ts); this pins
// the wiring.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const landing = read('src/components/commerce/CommerceGuestLanding.tsx');
const shell = read('src/components/commerce/CommerceShell.tsx');
const css = read('src/index.css');

describe('commerce guest page orb gutter', () => {
  it('the landing sets the body class while mounted and removes it on unmount', () => {
    expect(landing).toContain("export const GUEST_PAGE_CLASS = 'commerce-guest-page';");
    expect(landing).toContain('document.body.classList.add(GUEST_PAGE_CLASS);');
    expect(landing).toContain('return () => document.body.classList.remove(GUEST_PAGE_CLASS);');
  });

  it("the Commerce shell's main is the element that reserves the gutter", () => {
    expect(shell).toContain('<main data-commerce-main className=');
  });

  it('desktop widths only: the orb docks at 3rem and the main keeps 6rem on both sides', () => {
    const start = css.indexOf('@media (min-width: 1024px) {\n  body.commerce-guest-page .vtorb-fab');
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf('\n}\n', start));
    expect(block).toContain('left: 3rem !important;');
    expect(block).toContain('body.commerce-guest-page main[data-commerce-main]');
    expect(block).toContain('padding-left: 6rem;');
    expect(block).toContain('padding-right: 6rem;');
    // The rule comes after the generic desktop placement (left: 8rem) it overrides.
    expect(start).toBeGreaterThan(css.indexOf('left: 8rem !important;'));
  });
});
