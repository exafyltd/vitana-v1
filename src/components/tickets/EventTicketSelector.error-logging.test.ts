/**
 * EventTicketSelector.tsx's validateCode() — error-visibility fix.
 *
 * `if (error || !data)` folded a real DB error into the same "Invalid
 * code" message as a genuinely bad code, in the event-ticket purchase
 * flow. A user with a legitimate discount code could be told it's
 * invalid (and pay full price) purely because of a DB hiccup.
 *
 * Fixed: a real error now returns a distinct "couldn't verify, try
 * again" message (discount.checkFailed) and is logged; only a genuinely
 * missing/expired code (no error, no data) still returns discount.invalid.
 *
 * validateCode() is a useCallback closure inside this component, not
 * independently exported, and the component needs a large prop surface
 * (event, tickets, onPurchaseComplete, etc.) to render — not practical to
 * fully mock for this fix. Pinned at the source level, matching this
 * repo's established precedent for this exact destructure-and-branch shape.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'EventTicketSelector.tsx'), 'utf8');

describe('EventTicketSelector — validateCode() error logging', () => {
  it('branches on `error` separately from `!data`, rather than folding both into one condition', () => {
    expect(SRC).not.toMatch(/if \(error \|\| !data\)/);
    expect(SRC).toMatch(/if \(error\) \{/);
  });

  it('logs the error and returns a distinct message before the genuine-invalid-code branch', () => {
    const idx = SRC.indexOf('if (error) {');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 550);
    expect(after).toContain('console.error(');
    expect(after).toContain("translate('discount.checkFailed')");
    expect(after).toContain('if (!data) {');
    expect(after).toContain("translate('discount.invalid')");
  });
});
