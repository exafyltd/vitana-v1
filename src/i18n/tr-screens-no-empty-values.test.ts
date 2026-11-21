// VTID-05728 — Turkish screens catalog must have no empty labels.
// Two keys (screens.profile.dancePreferences, screens.sharing.stressLevels)
// shipped as "" and rendered blank labels for Turkish members.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const load = (loc: string): Json =>
  JSON.parse(readFileSync(join(process.cwd(), `src/i18n/${loc}/screens.json`), 'utf8'));

function walk(node: Json, path: string, out: Array<[string, string]>): void {
  if (typeof node === 'string') out.push([path, node]);
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walk(v as Json, path ? `${path}.${k}` : k, out);
  }
}

function get(node: Json, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k];
    return undefined;
  }, node);
}

const KEYS = ['screens.profile.dancePreferences', 'screens.sharing.stressLevels'];

describe('tr screens catalog has no empty values', () => {
  const tr = load('tr');

  it('has no empty string value anywhere', () => {
    const all: Array<[string, string]> = [];
    walk(tr, '', all);
    const empty = all.filter(([, v]) => v.trim() === '').map(([p]) => p);
    expect(empty).toEqual([]);
  });

  it.each(KEYS)('%s is non-empty in tr and exists non-empty in de and en', (key) => {
    for (const loc of ['tr', 'de', 'en']) {
      const v = get(load(loc), key);
      expect(typeof v).toBe('string');
      expect((v as string).trim().length).toBeGreaterThan(0);
    }
  });

  it('keeps the dance emoji as in the de and en source', () => {
    expect(get(tr, 'screens.profile.dancePreferences')).toContain('💃');
  });
});
