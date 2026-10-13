/**
 * VTID-05176 — static guards over the kit's source (src/ui/**):
 *  - no physical style keys (RTL, SR-19) except lines marked `physical-ok`
 *    (sheet.tsx's documented physical-side mapping, RN `Insets` objects);
 *  - no colour literal outside theme/legacy-literals.ts and the tokens stub (SR-17);
 *  - every i18n key the kit renders exists in all 11 locales (no `de` fallback);
 *  - no network module and no src/config/env.ts import (the kit is pure UI).
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { LOCALES } from '../../src/i18n';
import { resolveStrict } from './helpers';
import { KIT_KEYS } from '../../src/ui/catalogue-keys';

const UI = join(__dirname, '../../src/ui');
const CATALOGUE = join(__dirname, '../../app/native-ui-catalogue.tsx');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

const FILES = walk(UI).map((p) => ({ path: relative(UI, p), text: readFileSync(p, 'utf8') }));

/** Strips comments so documentation may name what the code must not do. */
function code(text: string): string[] {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((line) => {
      const i = line.indexOf('//');
      if (i < 0) return line;
      return /physical-ok/.test(line.slice(i)) ? line : line.slice(0, i);
    });
}

const PHYSICAL = [
  /\b(?:left|right)\s*:/,
  /\b(?:margin|padding|border)(?:Left|Right)\w*\s*:/,
  /\bborder(?:Top|Bottom)(?:Left|Right)Radius\s*:/,
  /textAlign\s*:\s*['"](?:left|right)['"]/,
  /\bscaleX\s*:\s*-1/,
];

describe('no physical style keys in src/ui (SR-19)', () => {
  it('finds the source files', () => {
    expect(FILES.length).toBeGreaterThan(30);
  });

  it.each(FILES.map((f) => [f.path, f.text]))('%s', (path, text) => {
    const hits: string[] = [];
    code(text).forEach((line, i) => {
      if (/physical-ok/.test(line)) return;
      for (const rx of PHYSICAL) if (rx.test(line)) hits.push(`${path}:${i + 1}: ${line.trim()}`);
    });
    expect(hits).toEqual([]);
  });

  it('the only physical-side STYLE mapping lives in sheet.tsx (others: RN Insets objects, placement geometry)', () => {
    const marked = FILES.filter((f) => /physical-ok/.test(f.text)).map((f) => f.path).sort();
    expect(marked).toEqual(['foundation/hitSlop.ts', 'foundation/insets.ts', 'overlay/placement.ts', 'sheet.tsx']);
  });
});

describe('no colour literals outside the theme layer (SR-17)', () => {
  const COLOR = [/#[0-9a-fA-F]{3,8}\b/, /\b(?:rgb|rgba|hsl|hsla)\(\s*\d/, /['"](?:white|black|transparent|red|green|blue|gray|grey)['"]/];
  const ALLOWED = new Set(['theme/legacy-literals.ts', 'theme/tokens-stub.ts']);

  it.each(FILES.filter((f) => !ALLOWED.has(f.path)).map((f) => [f.path, f.text]))('%s', (path, text) => {
    const hits: string[] = [];
    code(text).forEach((line, i) => {
      for (const rx of COLOR) if (rx.test(line)) hits.push(`${path}:${i + 1}: ${line.trim()}`);
    });
    expect(hits).toEqual([]);
  });

  it('the catalogue holds no colour literal either', () => {
    const hits = code(readFileSync(CATALOGUE, 'utf8')).filter((l) => COLOR.some((rx) => rx.test(l)));
    expect(hits).toEqual([]);
  });
});

describe('i18n keys used by the kit', () => {
  const used = new Set<string>();
  for (const f of FILES) {
    if (f.path === 'catalogue-keys.ts') continue;
    for (const m of f.text.matchAll(/\bt\(\s*['"]([\w.]+)['"]/g)) used.add(m[1]);
  }

  it('are exactly KIT_KEYS', () => {
    expect([...used].sort()).toEqual([...KIT_KEYS].sort());
  });

  it.each([...KIT_KEYS].flatMap((key) => LOCALES.map((locale) => [key, locale])))('%s exists in %s', (key, locale) => {
    const text = resolveStrict(locale, key);
    expect(typeof text).toBe('string');
    expect(text).not.toBe('');
  });
});

describe('the kit is pure UI', () => {
  const BANNED = [
    /\bfetch\s*\(/,
    /XMLHttpRequest/,
    /new\s+WebSocket/,
    /config\/env/,
    /@supabase\//,
    /integrations\/supabase/,
    /gateway-base/,
    /\baxios\b/,
    /https?:\/\//,
  ];
  const all = [...FILES, { path: '../../app/native-ui-catalogue.tsx', text: readFileSync(CATALOGUE, 'utf8') }];

  it.each(all.map((f) => [f.path, f.text]))('%s imports no network module and holds no URL', (path, text) => {
    const hits = code(text).filter((l) => BANNED.some((rx) => rx.test(l)));
    expect(`${path}: ${hits.join(' | ')}`).toBe(`${path}: `);
  });
});
