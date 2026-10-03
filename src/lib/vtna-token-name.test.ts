/**
 * VTID-04860 — the token is called VTNA, never "VTN".
 *
 * Owner directive (2026-10-03). The wallet currency was renamed VTN → VTNA in
 * migration 20251010181210, but "VTN" survived in toasts, wallet cards, all
 * 11 translation catalogs and the AI user context (which still looked up the
 * no-longer-existing currency_type 'VTN', so it always reported 0). This guard
 * fails the build if the bare word comes back.
 *
 * Not the token, left alone on purpose: event ticket serial numbers
 * ("VTN-20250115-000042", EventTicket's tenant code) and applied migrations.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { extname, join, relative } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');

// Bare uppercase word VTN; not VTNA, not vtn*, not a "VTN-<digit>" / "VTN-${" serial.
const BARE_VTN = /(?<![A-Za-z0-9_])VTN(?![A-Za-z0-9_])(?!-(?:\d|\$\{))/;

const TICKET_SERIAL_FILES = new Set([
  'src/lib/vtna-token-name.test.ts', // this guard names the word it forbids
  'src/components/tickets/EventTicket.tsx',
  'src/pages/TicketDemo.tsx',
  'src/pages/discover/Orders.tsx',
]);

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walk(abs, out);
    else if (['.ts', '.tsx', '.json'].includes(extname(abs))) out.push(abs);
  }
}

describe('VTID-04860: the token is VTNA', () => {
  it('no app source, catalog or edge function uses the bare word "VTN"', () => {
    const files: string[] = [];
    walk(join(ROOT, 'src'), files);
    walk(join(ROOT, 'supabase', 'functions'), files);
    expect(files.length).toBeGreaterThan(100);

    const offenders: string[] = [];
    for (const abs of files) {
      const rel = relative(ROOT, abs).split('\\').join('/');
      if (TICKET_SERIAL_FILES.has(rel)) continue;
      readFileSync(abs, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (BARE_VTN.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
        });
    }
    expect(offenders).toEqual([]);
  });

  it('the AI user context reads the VTNA wallet, not the retired VTN currency', () => {
    const src = readFileSync(join(ROOT, 'supabase/functions/fetch-user-context/index.ts'), 'utf8');
    expect(src).toContain("currency_type === 'VTNA'");
    expect(src).not.toContain("currency_type === 'VTN'");
  });

  it('every locale shows VTNA in the reward strings', () => {
    const locales = readdirSync(join(ROOT, 'src/i18n')).filter((d) =>
      statSync(join(ROOT, 'src/i18n', d)).isDirectory(),
    );
    expect(locales.length).toBeGreaterThanOrEqual(11);
    for (const lc of locales) {
      const file = join(ROOT, 'src/i18n', lc, 'screens.json');
      const text = readFileSync(file, 'utf8');
      expect(text.match(/"rewardVtn":\s*"[^"]*"/g)?.every((s) => s.includes('VTNA'))).toBe(true);
    }
  });
});
