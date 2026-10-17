#!/usr/bin/env node
/**
 * VTID-05184 — vendor the Health Sync contract v1 into the native app (N5a, plan change 2).
 *
 * Copies, byte for byte, from a vitana-platform checkout:
 *   services/gateway/src/services/health-sync/contract-v1.schema.json
 *   services/gateway/src/services/health-sync/contract-v1.lock.json
 *   docs/programs/health-hub/health-sync-v1/golden.json
 * into apps/mobile/src/health-sync/contract/v1/ and writes VENDOR.json
 * { source_repo, source_commit, schema_sha256, golden_sha256 }.
 *
 * It refuses a schema whose sha256 differs from the lock's "1.0" value, so a
 * changed contract can only reach the app through a re-vendor PR with a visible
 * diff (tests/health-sync/contract.test.ts pins the same hashes).
 *
 *   node scripts/native/vendor-health-sync-contract.mjs --from <vitana-platform checkout> [--commit <sha>]
 *
 * --commit defaults to `git rev-parse HEAD` in the checkout. Use C1's merge
 * commit on vitana-platform main.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
export const DEST = join(REPO, 'apps/mobile/src/health-sync/contract/v1');

export const SOURCES = {
  'contract-v1.schema.json': 'services/gateway/src/services/health-sync/contract-v1.schema.json',
  'contract-v1.lock.json': 'services/gateway/src/services/health-sync/contract-v1.lock.json',
  'golden.json': 'docs/programs/health-hub/health-sync-v1/golden.json',
};

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

export function vendor({ from, commit, dest = DEST }) {
  const schema = readFileSync(join(from, SOURCES['contract-v1.schema.json']));
  const lock = JSON.parse(readFileSync(join(from, SOURCES['contract-v1.lock.json']), 'utf8'));
  const schemaSha = sha256(schema);
  if (lock?.versions?.['1.0'] !== schemaSha) {
    throw new Error(`vendor-health-sync-contract: schema sha256 ${schemaSha} differs from the lock's 1.0 value ${lock?.versions?.['1.0']}`);
  }
  mkdirSync(dest, { recursive: true });
  for (const [name, rel] of Object.entries(SOURCES)) copyFileSync(join(from, rel), join(dest, name));
  const vendorJson = {
    source_repo: 'exafyltd/vitana-platform',
    source_commit: commit,
    schema_sha256: schemaSha,
    golden_sha256: sha256(readFileSync(join(dest, 'golden.json'))),
  };
  writeFileSync(join(dest, 'VENDOR.json'), `${JSON.stringify(vendorJson, null, 2)}\n`);
  return vendorJson;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const from = opt('from');
  if (!from) {
    console.error('usage: vendor-health-sync-contract.mjs --from <vitana-platform checkout> [--commit <sha>]');
    process.exit(2);
  }
  const commit = opt('commit') ?? execFileSync('git', ['-C', from, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const r = vendor({ from: resolve(from), commit });
  console.log(`vendor-health-sync-contract: schema ${r.schema_sha256.slice(0, 12)}…, golden ${r.golden_sha256.slice(0, 12)}…, source ${r.source_commit}`);
}
