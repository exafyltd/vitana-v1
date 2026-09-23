/**
 * VTID-04430 — every frontend build is stamped with its commit, so support
 * tickets (typed and voice) and analytics events carry a real app_version.
 * VITE_APP_VERSION was read in two places and set nowhere, so it was always null.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('app version stamp', () => {
  it.each([
    '.github/workflows/AWS-STAGE-DEPLOY-FRONTEND.yml',
    '.github/workflows/AWS-PROD-DEPLOY-FRONTEND.yml',
    '.github/workflows/PREVIEW-DEPLOY-FRONTEND.yml',
  ])('%s writes VITE_APP_VERSION from the checked-out commit', (wf) => {
    expect(read(wf)).toMatch(/VITE_APP_VERSION=\$\(git rev-parse --short=12 HEAD\)/);
  });
  it('the committed .env has a local default so the html placeholder always resolves', () => {
    expect(read('.env')).toMatch(/^VITE_APP_VERSION="local"$/m);
  });
  it('index.html exposes the stamp for the ORB widget', () => {
    expect(read('index.html')).toContain('<meta name="vitana-app-version" content="%VITE_APP_VERSION%" />');
  });
});
