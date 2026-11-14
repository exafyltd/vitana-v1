// VTID-05735 — accept step for the Bedrock translation reviewer.
// Reads the audit verdicts written by scripts/i18n-audit-llm.mjs (i18n-audit/<locale>/<shard>) and, for the
// screens.nativeHealthSync.osPermission keys, removes the _pending_review marker only when every key got OK.
// Any other verdict fails the job and leaves the marker in place.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const locale = (process.argv.find((a) => a.startsWith('--locale=')) || '--locale=en').slice(9);
const shard = 'screens';
const NODE = 'nativeHealthSync.osPermission';

const auditPath = join(ROOT, 'i18n-audit', locale, `${shard}.json`);
if (!existsSync(auditPath)) { console.error(`[accept] no audit file ${auditPath}`); process.exit(1); }
const audit = JSON.parse(readFileSync(auditPath, 'utf8'));
const verdicts = Object.entries(audit.verdicts || {}).filter(([p]) => p.includes(`${NODE}.`));
if (verdicts.length < 2) { console.error(`[accept] expected 2 verdicts for ${NODE}, got ${verdicts.length}`); process.exit(1); }
const bad = verdicts.filter(([, v]) => v.verdict !== 'OK');
if (bad.length) { console.error('[accept] not accepted:', bad.map(([p, v]) => `${p}=${v.verdict}`).join(', ')); process.exit(1); }

const shardPath = join(ROOT, 'src/i18n', locale, `${shard}.json`);
const doc = JSON.parse(readFileSync(shardPath, 'utf8'));
const node = doc?.screens?.nativeHealthSync?.osPermission;
if (!node) { console.error('[accept] node not found in shard'); process.exit(1); }
if (!('_pending_review' in node)) { console.log('[accept] no marker; nothing to do'); process.exit(0); }
delete node._pending_review;
writeFileSync(shardPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
console.log(`[accept] ${verdicts.length} keys OK by the reviewer; marker removed from ${locale}/${shard}.json`);
