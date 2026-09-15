/**
 * VTID-03894. Adding a network to this picker is a one-word change that looks
 * harmless and silently promises attribution we cannot deliver: the supplier
 * answers, we store it, and none of their sales are ever matched.
 *
 * So the picker is pinned to the networks with a REAL conversion path, and the
 * gateway's own allowlist is pinned alongside it so the two cannot drift.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sheet = readFileSync(resolve(__dirname, './AddProductSheet.tsx'), 'utf8');
const form = readFileSync(resolve(__dirname, './ProductForm.tsx'), 'utf8');

/** Only these two are wired: awin is pulled, admitad is pushed. */
const WIRED = ['awin', 'admitad'];
const NOT_WIRED = ['cj', 'rakuten', 'impact', 'partnerize', 'tradedoubler'];

describe('the affiliate network picker', () => {
  it('offers every network that has a conversion path', () => {
    for (const n of WIRED) expect(sheet).toContain(`value="${n}"`);
  });

  it('offers no network without one', () => {
    for (const n of NOT_WIRED) expect(sheet).not.toContain(`value="${n}"`);
  });

  it('keeps "other" selectable — a supplier not on a network can still list', () => {
    expect(sheet).toContain('value="other"');
  });

  it('will not let a named network through without an advertiser id', () => {
    // Naming a network with no id is the exact shape of "looks connected,
    // attributes nothing": conversions resolve to `<network>_unknown`.
    expect(sheet).toContain("network !== 'other' && advertiserId.trim().length === 0");
  });

  it('omits the id for "other" rather than sending an empty string', () => {
    expect(form).toContain("affiliateNetwork === 'other' ? undefined");
  });
});
