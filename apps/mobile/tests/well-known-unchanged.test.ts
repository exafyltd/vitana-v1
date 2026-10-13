/**
 * VTID-05178 (N4-APP Change 14) — the production web's `.well-known` files are
 * not touched by native work. Universal links on vitanaland.com for the store
 * app (narrowing the Appilix `"*"`, store identifiers, store fingerprints) are
 * a Wave 3 store-release item with its own plan.
 *
 * This lives in apps/mobile, not src/, because a src/** file is a web deploy
 * path. Changing these files on purpose means updating the hashes here in
 * that store-release PR.
 */
import { createHash } from 'crypto';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const DIR = join(__dirname, '../../../public/.well-known');

const PINNED: Record<string, string> = {
  'apple-app-site-association': '58ea4e238f9fadc8c6b4c60eb91154336f176b02c6af267c049797ecaca5f42c',
  'assetlinks.json': '2628c6e8d832bda6d2463382cecface8aeb51539db637b3b2ce4d93552ed1073',
};

describe('public/.well-known is byte-identical to the committed originals', () => {
  it('holds exactly the pinned files', () => {
    expect(readdirSync(DIR).sort()).toEqual(Object.keys(PINNED).sort());
  });

  it.each(Object.entries(PINNED))('%s', (file, sha256) => {
    expect(createHash('sha256').update(readFileSync(join(DIR, file))).digest('hex')).toBe(sha256);
  });
});
