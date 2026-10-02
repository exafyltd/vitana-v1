/**
 * VTID-04809 — members can no longer credit their own wallet.
 *
 * user_wallets.CREDITS is now the canonical VTNA ledger, and earned VTNA buys
 * real goods and subscription months. The database refuses
 * update_user_balance(..., 'add') and direct writes to user_wallets, so any
 * client code still trying to add credits would fail at runtime (BuyCreditsPopup
 * used to grant itself "bonus" credits this way). Credits are added only by the
 * platform: the reward ledger (credit_wallet, service role) and the
 * SECURITY DEFINER exchange/transfer RPCs.
 *
 * Pinned at the source level, matching this repo's source-assertion precedent
 * (see GoLivePopup.error-logging.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '../../..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'node_modules' ? [] : sourceFiles(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

describe('no client-side wallet credit (VTID-04809)', () => {
  const files = sourceFiles(SRC).map((p) => ({ p, s: readFileSync(p, 'utf8') }));

  it("never calls updateBalance(..., 'add')", () => {
    const offenders = files.filter(({ s }) => /updateBalance\([^)]*['"]add['"]/.test(s)).map(({ p }) => p);
    expect(offenders).toEqual([]);
  });

  it('never writes user_wallets directly', () => {
    const offenders = files
      .filter(({ s }) => /from\(['"]user_wallets['"]\)\s*\.(update|insert|upsert|delete)\(/.test(s))
      .map(({ p }) => p);
    expect(offenders).toEqual([]);
  });

  it('BuyCreditsPopup no longer grants bonus credits', () => {
    const s = readFileSync(join(__dirname, 'BuyCreditsPopup.tsx'), 'utf8');
    expect(s).not.toContain('bonus:');
    expect(s).not.toContain('updateBalance');
  });
});
