#!/usr/bin/env node
// Apply LLM-audit EDIT_SUGGESTED verdicts back into the catalog.
//
// Reads:   i18n-audit/<locale>/<shard>.json
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
// Audit reports live outside src/i18n/ so they are not swept into the
// import.meta.glob that builds the shipped catalogs (VTID-03509).
const auditDir = path.join('i18n-audit', locale);
if (!fs.existsSync(dir)) {
  console.error(`No such locale dir: ${dir}`);
  process.exit(2);
}

let totalApplied = 0;
let totalSkippedLowConf = 0;
let totalSkippedLowVerdict = 0;
const deferred = [];

function getByDotPath(obj, dotPath) {
  let cur = obj;
  for (const p of dotPath.split('.')) {
    if (cur === undefined || cur === null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

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

// --- long-word veto (VTID-03509) -------------------------------------------
//
// The LLM auditor judges "natural German" and does not know about the mobile
// layout constraint in CLAUDE.md: German compounds are hyphenated at 22+ chars
// so they wrap on narrow viewports. The auditor consistently suggests removing
// those hyphens — "Nahrungsergänzungs-Mittel" → "Nahrungsergänzungsmittel"
// (24 chars) reads better and breaks the layout.
//
// Applying the DE suggestions unfiltered took the catalog from 0 long-word
// violations to 18, which fails i18n-long-words.yml. Confidence is not the
// issue — these are high-confidence and linguistically correct. They just
// violate a constraint the auditor was never told about, so they are vetoed
// here rather than being talked out of via prompt tweaks.
//
// Only NEWLY introduced long words are vetoed; a suggestion that leaves an
// already-long word alone still applies.
const MAX_WORD = Number(args['max-word-length'] ?? 22);
const LONG_WORD_RX = new RegExp(
  `[A-Za-zÄÖÜäöüßéàèùâêîôûïëçñáíóúýÝÁÍÓÚČĆĐŠŽčćđšž]{${MAX_WORD},}`,
  'gu',
);
// Locales whose layout depends on hyphenated compounds. German is the only one
// at this scale today; the hook is here so adding one is a list edit.
const LONG_WORD_LOCALES = new Set(['de']);

function longWords(s) {
  return typeof s === 'string' ? [...String(s).matchAll(LONG_WORD_RX)].map((m) => m[0]) : [];
}

/** Long words the suggestion introduces that the current value did not have. */
function newLongWords(current, suggested) {
  if (!LONG_WORD_LOCALES.has(locale)) return [];
  const before = new Set(longWords(current));
  return longWords(suggested).filter((w) => !before.has(w));
}

let totalVetoedLongWord = 0;

const shardSummaries = [];

if (!fs.existsSync(auditDir)) {
  console.error(`no audit reports for locale "${locale}" at ${auditDir} — run i18n-audit-llm.mjs first`);
  process.exit(2);
}

for (const f of fs.readdirSync(auditDir).sort()) {
  if (!f.endsWith('.json')) continue;
  const auditPath = path.join(auditDir, f);
  const shardName = f.replace(/\.json$/, '');
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
  let vetoLongWord = 0;

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

    // Veto before writing: a linguistically-correct suggestion that breaks the
    // mobile layout is still a regression.
    const currentValue = getByDotPath(shard, key);
    const introduced = newLongWords(currentValue, verdictObj.suggested);
    if (introduced.length > 0) {
      vetoLongWord++;
      deferred.push({
        shard: shardName,
        key,
        verdict: 'VETOED_LONG_WORD',
        confidence: verdictObj.confidence ?? null,
        issue: `would introduce ${introduced.length > 1 ? 'words' : 'a word'} of ${MAX_WORD}+ chars (${introduced.join(', ')}) — violates the German compound hyphenation rule`,
        suggested: verdictObj.suggested,
      });
      continue;
    }

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
  totalVetoedLongWord += vetoLongWord;
}

console.log(`\n=== Audit suggestion application (${locale}) ===`);
console.log(`min-confidence: ${minConfidence}`);
console.log(`dry-run:        ${dryRun}`);
console.log(`Applied:        ${totalApplied}`);
console.log(`Skipped (low confidence): ${totalSkippedLowConf}`);
console.log(`Skipped (low verdict):    ${totalSkippedLowVerdict}`);
console.log(`Vetoed (long word ${MAX_WORD}+):   ${totalVetoedLongWord}${LONG_WORD_LOCALES.has(locale) ? '' : ' (rule not active for this locale)'}`);

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
