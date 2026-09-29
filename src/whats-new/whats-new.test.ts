/**
 * VTID-04733 — the What's New manifest the gateway turns into cards.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { buildManifest, validateEntry } from '../../scripts/whats-new/build-whats-new.mjs';

const ROOT = path.resolve(__dirname, '../..');
const paths = { exact: new Set(['/me/profile', '/home/comments']), prefixes: ['/admin'] };
const good = {
  id: 'profile-redesign',
  added: '2026-09-29',
  title: { en: 'Your Profile, Reimagined', de: 'Dein Profil, neu gedacht' },
  description: { en: 'A calmer, clearer profile.', de: 'Ein ruhigeres, klareres Profil.' },
  deepLink: '/me/profile',
};
const check = (patch: Record<string, unknown>, file = 'profile-redesign.json') =>
  validateEntry({ ...good, ...patch }, file, paths, new Set());

describe('whats-new entries', () => {
  it('accepts a complete entry', () => expect(check({})).toEqual([]));
  it('requires en and de', () => {
    expect(check({ title: { en: 'x' } }).join()).toMatch(/title\.de is required/);
    expect(check({ description: { de: 'x' } }).join()).toMatch(/description\.en is required/);
  });
  it('enforces du-form German and copy length', () => {
    expect(check({ description: { en: 'a', de: 'Öffnen Sie Ihr Profil' } }).join()).toMatch(/du-form/);
    expect(check({ description: { en: 'a'.repeat(300), de: 'b' } }).join()).toMatch(/max 220/);
  });
  it('requires id == file name, kebab-case, valid date', () => {
    expect(check({}, 'other.json').join()).toMatch(/match the file name/);
    expect(check({ id: 'Bad_Id' }, 'Bad_Id.json').join()).toMatch(/kebab-case/);
    expect(check({ added: '29.09.2026' }).join()).toMatch(/YYYY-MM-DD/);
  });
  it('deepLink must be a known in-app path without query', () => {
    expect(check({ deepLink: 'https://evil.example' }).join()).toMatch(/in-app path/);
    expect(check({ deepLink: '/me/profile?x=1' }).join()).toMatch(/in-app path/);
    expect(check({ deepLink: '/nowhere' }).join()).toMatch(/not a known route/);
    expect(check({ deepLink: '/home/comments' })).toEqual([]);
  });
});

describe('whats-new build', () => {
  it('builds a manifest from the committed entries', () => {
    const m = buildManifest();
    expect(m.version).toBe(1);
    expect(Array.isArray(m.entries)).toBe(true);
  });
  it('runs before every build, ships in the Docker context, output not committed', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts.prebuild).toContain('scripts/whats-new/build-whats-new.mjs');
    const ignore = fs.readFileSync(path.join(ROOT, '.dockerignore'), 'utf8').split('\n').map((l) => l.trim());
    if (ignore.includes('scripts')) expect(ignore).toContain('!scripts/whats-new');
    expect(fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8')).toMatch(/^public\/whats-new\.json$/m);
  });
});
