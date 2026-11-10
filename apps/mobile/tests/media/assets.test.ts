/**
 * VTID-05677 — plan Decision 8: the three demo-short thumbnails are
 * byte-identical copies of the web files (`src/assets/shorts-*.jpg`,
 * `MediaHub.tsx:59-61`); the native resolver blocks a direct `src/` require
 * (`apps/mobile/resolution.js:94-98`).
 */
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

const APP = join(__dirname, '../..');
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

describe('demo short thumbnails', () => {
  it.each(['shorts-morning-stretch.jpg', 'shorts-healthy-breakfast.jpg', 'shorts-breathing-exercise.jpg'])('%s equals the web file', (name) => {
    expect(sha(join(APP, 'src/screens/media/assets', name))).toBe(sha(join(APP, '../../src/assets', name)));
  });
});
