// The platform files for the ORB parity check come from GitLab when CI_JOB_TOKEN is set (the job token of the vitana-v1
// pipeline), and from GitHub only as the legacy fallback. The tests use a fake fetch: no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fetchPlatformFiles, PLATFORM_FILES, platformFileRequest } from './orb-parity.mjs';

test('GitLab: the file request uses the project path, the raw endpoint, ref and the JOB-TOKEN header', () => {
  const env = { CI_JOB_TOKEN: 'job-token', CI_SERVER_HOST: 'gitlab.vitanaland.com' };
  const r = platformFileRequest('services/gateway/src/routes/orb-live.ts', 'main', env);
  assert.equal(r.url, 'https://gitlab.vitanaland.com/api/v4/projects/vitana%2Fvitana-platform/repository/files/services%2Fgateway%2Fsrc%2Froutes%2Forb-live.ts/raw?ref=main');
  assert.deepEqual(r.headers, { 'JOB-TOKEN': 'job-token' });
});

test('GitLab: without CI_JOB_TOKEN there is no GitLab request (the GitHub fallback applies)', () => {
  assert.equal(platformFileRequest('x.ts', 'main', {}), null);
});

test('fetch: every platform file is read from GitLab when CI_JOB_TOKEN is set, and written under its own path', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'orb-parity-'));
  const seen = [];
  const fetchImpl = async (url, opts) => {
    seen.push({ url, headers: opts.headers });
    return { ok: true, text: async () => `// ${url}\n` };
  };
  await fetchPlatformFiles(dir, { fetchImpl, env: { CI_JOB_TOKEN: 't', CI_SERVER_HOST: 'gitlab.vitanaland.com' } });
  assert.equal(seen.length, Object.keys(PLATFORM_FILES).length);
  assert.ok(seen.every((s) => s.url.startsWith('https://gitlab.vitanaland.com/api/v4/projects/vitana%2Fvitana-platform/repository/files/')));
  assert.ok(seen.every((s) => s.headers['JOB-TOKEN'] === 't' && !('Authorization' in s.headers)));
  for (const p of Object.values(PLATFORM_FILES)) assert.ok(readFileSync(join(dir, p), 'utf8').length > 0, p);
});

test('fetch: a failing GitLab read fails closed with the HTTP status', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'orb-parity-'));
  const fetchImpl = async () => ({ ok: false, status: 403, text: async () => '' });
  await assert.rejects(() => fetchPlatformFiles(dir, { fetchImpl, env: { CI_JOB_TOKEN: 't', CI_SERVER_HOST: 'gitlab.vitanaland.com' } }), /HTTP 403.*never skips/);
});
