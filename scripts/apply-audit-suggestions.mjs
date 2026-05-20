#!/usr/bin/env node
// Apply LLM-audit EDIT_SUGGESTED verdicts back into the catalog.
//
// Reads:   src/i18n/<locale>/<shard>._audit.json
// Writes:  src/i18n/<locale>/<shard>.json
// Skips:   confidence below --min-confidence (default 0.80)
//          LOW_CONFIDENCE verdicts (auditor unsure about source)
// Reports: per-shard apply count + a deferred-review list for skipped items.
//
// Usage:
//   node scripts/apply-audit-suggestions.mjs --locale=de
//   node scripts/apply-audit-suggestions.mjs --locale=de --min-confidence=0.9 --dry-run

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const locale = args.locale ?? 'de';
const minConfidence = Number(args['min-confidence'] ?? 0.8);
const dryRun = Boolean(args['dry-run']);

const dir = path.join('src/i18n', locale);
if (!fs.existsSync(dir)) {
  console.error(`No such locale dir: ${dir}`);
  process.exit(2);
}

let totalApplied = 0;
let totalSkippedLowConf = 0;
let totalSkippedLowVerdict = 0;
const deferred = [];

function setByDotPath(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] === undefined || typeof cur[p] !== 'object' || cur[p] === null) return false;
    cur = cur[p];
  }
  const leaf = parts[parts.length - 1];
  if (!(leaf in cur)) return false;
  cur[leaf] = value;
  return true;
}

const shardSummaries = [];

for (const f of fs.readdirSync(dir).sort()) {
  if (!f.endsWith('._audit.json')) continue;
  const auditPath = path.join(dir, f);
  const shardName = f.replace(/\._audit\.json$/, '');
  const shardPath = path.join(dir, `${shardName}.json`);
  if (!fs.existsSync(shardPath)) {
    console.warn(`audit without shard: ${shardPath}`);
    continue;
  }

  const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  const shard = JSON.parse(fs.readFileSync(shardPath, 'utf8'));

  let applied = 0;
  let skipLow = 0;
  let skipVerdict = 0;

  for (const [key, verdictObj] of Object.entries(audit.verdicts || {})) {
    if (verdictObj.verdict !== 'EDIT_SUGGESTED') {
      if (verdictObj.verdict === 'LOW_CONFIDENCE') {
        skipVerdict++;
        deferred.push({ shard: shardName, key, verdict: verdictObj.verdict, issue: verdictObj.issue ?? null });
      }
      continue;
    }
    const conf = verdictObj.confidence ?? 0;
    if (conf < minConfidence) {
      skipLow++;
      deferred.push({ shard: shardName, key, verdict: 'EDIT_SUGGESTED', confidence: conf, issue: verdictObj.issue, suggested: verdictObj.suggested });
      continue;
    }
    if (verdictObj.suggested === undefined || verdictObj.suggested === null) continue;
    const ok = setByDotPath(shard, key, verdictObj.suggested);
    if (ok) applied++;
  }

  if (applied > 0 && !dryRun) {
    fs.writeFileSync(shardPath, JSON.stringify(shard, null, 2) + '\n');
  }
  if (applied || skipLow || skipVerdict) {
    shardSummaries.push({ shard: shardName, applied, skipLow, skipVerdict });
  }
  totalApplied += applied;
  totalSkippedLowConf += skipLow;
  totalSkippedLowVerdict += skipVerdict;
}

console.log(`\n=== Audit suggestion application (${locale}) ===`);
console.log(`min-confidence: ${minConfidence}`);
console.log(`dry-run:        ${dryRun}`);
console.log(`Applied:        ${totalApplied}`);
console.log(`Skipped (low confidence): ${totalSkippedLowConf}`);
console.log(`Skipped (low verdict):    ${totalSkippedLowVerdict}`);

console.log(`\nPer-shard applied (non-zero):`);
for (const s of shardSummaries) {
  if (s.applied > 0) console.log(`  ${s.shard.padEnd(30)} +${s.applied}`);
}

if (!dryRun) {
  const deferPath = `docs/i18n-audit-${locale}-deferred.md`;
  const md = [
    `# i18n audit — ${locale} — deferred review`,
    ``,
    `Suggestions below were SKIPPED by \`apply-audit-suggestions.mjs --min-confidence=${minConfidence}\``,
    `because they are either LOW_CONFIDENCE or have auditor confidence < ${minConfidence}.`,
    `Hand-review and apply individually.`,
    ``,
    `Total skipped: ${deferred.length}`,
    ``,
    `| Shard | Key | Verdict | Conf | Issue | Suggested |`,
    `|---|---|---|---|---|---|`,
  ];
  for (const d of deferred) {
    const cell = (x) => (x ?? '').toString().replace(/\|/g, '\\|').replace(/\n/g, ' ');
    md.push(`| ${d.shard} | ${cell(d.key)} | ${d.verdict} | ${d.confidence ?? ''} | ${cell(d.issue)} | ${cell(d.suggested)} |`);
  }
  fs.writeFileSync(deferPath, md.join('\n') + '\n');
  console.log(`\nDeferred list: ${deferPath}`);
}
