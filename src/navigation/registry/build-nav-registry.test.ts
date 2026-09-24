/**
 * VTID-04502 — the build publishes the registry the gateway reads.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { buildRegistry } from '../../../scripts/nav/build-nav-registry.mjs';
import { SCREENS } from './index';

const ROOT = path.resolve(__dirname, '../../..');

describe('VTID-04502 nav-registry build', () => {
  const reg = buildRegistry();

  it('carries every screen with all 11 languages merged in', () => {
    expect(reg.screens).toHaveLength(SCREENS.length);
    const incomplete = reg.screens.filter((s: { i18n: Record<string, unknown> }) => Object.keys(s.i18n).length !== 11);
    expect(incomplete.map((s: { id: string }) => s.id)).toEqual([]);
  });

  it('runs before every build, and the output is not committed', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts.prebuild).toContain('scripts/nav/build-nav-registry.mjs');
    expect(fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8')).toMatch(/^public\/nav-registry\.json$/m);
  });
});
