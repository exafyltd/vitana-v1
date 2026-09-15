/**
 * useResellerSales.ts — reseller_payouts query error-visibility fix.
 *
 * The payouts query destructured only `{ data: payouts }`, unlike its
 * sibling `reseller_attributions` query on the very next lines, which
 * already checks `attrError`. On a real Postgres failure, `payouts`
 * resolved to `undefined` — indistinguishable from "this reseller has no
 * payout history" — so `commissionPaidToWallet` silently computed to 0 and
 * `lastPayout` to null. A reseller who has genuinely been paid would see
 * "$0 paid out, no payout history" with no error surfaced anywhere: a
 * confidently wrong financial statement, not a missing one.
 *
 * Pinned at the source level — matching this repo's own established
 * pattern for hook files (useTenant.error-logging.test.ts,
 * useCalendarEvents.idempotency-error-logging.test.ts) rather than a full
 * react-query render harness.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useResellerSales.ts'), 'utf8');

describe('useResellerSales — reseller_payouts query error logging', () => {
  it('destructures `error` from the reseller_payouts query, not just `data`', () => {
    const idx = SRC.indexOf(".from(\"reseller_payouts\")");
    expect(idx).toBeGreaterThan(-1);
    const before = SRC.slice(Math.max(0, idx - 100), idx);
    expect(before).toMatch(/const \{ data: payouts, error: payoutsError \} = await supabase\s*$/);
  });

  it('logs and throws the payouts error before the attributions error is checked', () => {
    const idx = SRC.indexOf('if (payoutsError)');
    expect(idx).toBeGreaterThan(-1);
    const block = SRC.slice(idx, idx + 150);
    expect(block).toContain('console.error(');
    expect(block).toContain('throw payoutsError;');

    // Must appear after the attrError check (attributions are fetched/checked first)
    const attrErrIdx = SRC.indexOf('if (attrError)');
    expect(attrErrIdx).toBeGreaterThan(-1);
    expect(idx).toBeGreaterThan(attrErrIdx);
  });
});
