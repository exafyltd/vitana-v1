/**
 * VTID-03976 — Phase C3: a light mobile-responsive pass on the Orders and
 * Inbox tabs, stacking rows into cards below the `md` breakpoint instead
 * of shipping a dedicated mobile variant. Source-check pattern (matching
 * `sidebar.rtl.test.ts`) since a real layout measurement needs a browser.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = readFileSync(resolve(process.cwd(), 'src/pages/CommerceHealthOrders.tsx'), 'utf8');

describe('CommerceHealthOrders mobile-responsive pass (VTID-03976)', () => {
  it('the Orders tab renders a desktop table AND a mobile card list', () => {
    expect(SRC.match(/hidden md:block \$\{panelClass\}/g)?.length).toBe(2);
    expect(SRC.match(/flex flex-col gap-3 md:hidden/g)?.length).toBe(2);
  });

  it('the mobile order card still gates the status control and upload button on canActOn(o)', () => {
    const firstMarker = SRC.indexOf('Mobile: stacked cards');
    const secondMarker = SRC.indexOf('Mobile: stacked cards', firstMarker + 1);
    const mobileOrdersSection = SRC.slice(firstMarker, secondMarker);
    expect(mobileOrdersSection).toContain('canActOn(o)');
    expect(mobileOrdersSection).toContain('screens.admin.uploadResult');
  });

  it('the mobile inbox card still calls setResolveRow, same handler as the desktop row', () => {
    const lastMobileSection = SRC.slice(SRC.lastIndexOf('Mobile: stacked cards'));
    expect(lastMobileSection).toContain('onClick={() => setResolveRow(row)}');
  });
});
