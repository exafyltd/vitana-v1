/**
 * VTID-05107 — every screen route has exactly one Spotlight archetype
 * (docs/design-system/SPOTLIGHT_RULES.md §A). Adding a page to App.tsx without
 * a manifest entry fails here: run `node scripts/design/screen-manifest.mjs --sync`,
 * then review the guessed archetype.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from '@/components/layout/spotlight/archetypes';
import { buildInventory } from '../../scripts/design/desktop-screen-inventory.mjs';
import manifest from './screen-manifest.json';

interface Entry { path: string; archetype: string; tier: string; area: string; status: string; phase: string }

const APP = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8');
const routes: { path: string; tier: string }[] = buildInventory(APP).screens;
const entries = manifest.screens as Entry[];

describe('VTID-05107 Spotlight screen manifest', () => {
  it('lists every screen route in App.tsx exactly once', () => {
    const listed = new Set(entries.map((e) => e.path));
    const missing = routes.map((r) => r.path).filter((p) => !listed.has(p));
    expect(missing, 'routes without a manifest entry — run node scripts/design/screen-manifest.mjs --sync').toEqual([]);
    expect(entries.length).toBe(new Set(entries.map((e) => e.path)).size);
  });

  it('has no stale entries for routes that no longer exist', () => {
    const live = new Set(routes.map((r) => r.path));
    expect(entries.filter((e) => !live.has(e.path)).map((e) => e.path)).toEqual([]);
  });

  it('gives every screen a known archetype, a tier and a status', () => {
    const bad = entries.filter(
      (e) => !(ARCHETYPES as readonly string[]).includes(e.archetype) || !['A', 'B', 'C', 'P'].includes(e.tier) || !['legacy', 'migrated'].includes(e.status),
    );
    expect(bad).toEqual([]);
  });

  it('tiers match the route classification', () => {
    const tierOf = new Map(routes.map((r) => [r.path, r.tier]));
    expect(entries.filter((e) => tierOf.get(e.path) !== e.tier).map((e) => e.path)).toEqual([]);
  });

  it('operator routes are workspace screens', () => {
    expect(entries.filter((e) => e.tier === 'C' && e.archetype !== 'workspace').map((e) => e.path)).toEqual([]);
  });
});
