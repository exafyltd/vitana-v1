#!/usr/bin/env node
/**
 * VTID-05059 — Kiro steering guard.
 *
 * Kiro IDE reads `.kiro/steering/*.md`; Claude Code reads `CLAUDE.md` and
 * `.claude/rules/*.md`. The steering files link to those files instead of
 * copying them. This guard keeps the two in step:
 *   1. every `.claude/rules/<x>.md` has a steering file that links it, with
 *      `inclusion: fileMatch` and `fileMatchPattern` equal to its `paths:`;
 *   2. every `#[[file:…]]` link in a steering file points at a file that exists;
 *   3. an always-included steering file links `CLAUDE.md`.
 * Usage: node scripts/ci/kiro-steering/guard.cjs [repoRoot]
 */
'use strict';
const fs = require('fs');
const path = require('path');

function frontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  return m ? m[1] : '';
}

/** Minimal YAML for the two shapes used here: `key: value` and `key:` + `  - item` lists. */
function parseFrontMatter(fm) {
  const out = {};
  let listKey = null;
  for (const raw of fm.split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(raw);
    if (item && listKey) { out[listKey].push(unquote(item[1].trim())); continue; }
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(raw);
    if (!kv) continue;
    if (kv[2] === '') { listKey = kv[1]; out[listKey] = []; } else { listKey = null; out[kv[1]] = unquote(kv[2].trim()); }
  }
  return out;
}

function unquote(s) {
  return /^(["']).*\1$/.test(s) ? s.slice(1, -1) : s;
}

function asList(v) {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function fileLinks(text) {
  return [...text.matchAll(/#\[\[file:([^\]]+)\]\]/g)].map((m) => m[1].trim());
}

function check(root) {
  const errors = [];
  const rulesDir = path.join(root, '.claude', 'rules');
  const steerDir = path.join(root, '.kiro', 'steering');
  const rules = fs.existsSync(rulesDir) ? fs.readdirSync(rulesDir).filter((f) => f.endsWith('.md')) : [];
  const steering = fs.existsSync(steerDir) ? fs.readdirSync(steerDir).filter((f) => f.endsWith('.md')) : [];
  if (steering.length === 0) return ['no .kiro/steering/*.md files'];

  const parsed = steering.map((f) => {
    const text = fs.readFileSync(path.join(steerDir, f), 'utf8');
    return { file: f, text, fm: parseFrontMatter(frontMatter(text)), links: fileLinks(text) };
  });

  for (const s of parsed) {
    for (const link of s.links) {
      if (!fs.existsSync(path.join(root, link))) errors.push(`.kiro/steering/${s.file}: #[[file:${link}]] does not exist`);
    }
  }

  if (!parsed.some((s) => (s.fm.inclusion ?? 'always') === 'always' && s.links.includes('CLAUDE.md'))) {
    errors.push('no always-included steering file links CLAUDE.md');
  }

  for (const r of rules) {
    const rel = `.claude/rules/${r}`;
    const paths = asList(parseFrontMatter(frontMatter(fs.readFileSync(path.join(rulesDir, r), 'utf8'))).paths);
    const twins = parsed.filter((s) => s.links.includes(rel));
    if (twins.length === 0) { errors.push(`${rel} has no .kiro/steering twin linking it`); continue; }
    for (const t of twins) {
      if (t.fm.inclusion !== 'fileMatch') errors.push(`.kiro/steering/${t.file}: links ${rel} but inclusion is not fileMatch`);
      const globs = asList(t.fm.fileMatchPattern);
      if (JSON.stringify([...globs].sort()) !== JSON.stringify([...paths].sort())) {
        errors.push(`.kiro/steering/${t.file}: fileMatchPattern ${JSON.stringify(globs)} != ${rel} paths ${JSON.stringify(paths)}`);
      }
    }
  }
  // Plan owner-autonomy: the standing owner instruction and its complete stop table.
  errors.push(...checkOwnerAutonomy(root));
  return errors;
}

/*
 * Plan owner-autonomy: the standing owner instruction and its complete stop table live in one always-included steering
 * file, identical in vitana-platform and vitana-v1. A later edit that drops the file, makes it optional, or removes a
 * stop from its table is a red check, not a quiet change. Runs where the pipeline steering exists.
 */
const OWNER_AUTONOMY = '.kiro/steering/vitana-owner-autonomy.md';
// One anchor per stop row of the table, plus the end point, the stop message and the no-trailing-question rule.
const OWNER_AUTONOMY_ANCHORS = Object.freeze([
  ['§7d', 'stop: migration apply needs owner approval'],
  ['§7c', 'stop: production'],
  ['§3a', 'stop: protected gate files'],
  ['data-loss', 'stop: security or data-loss risk'],
  ['3 fix-forward attempts', 'stop: the same failure after 3 attempts'],
  ['escalated sparring verdict', 'stop: escalated sparring'],
  ['IF–THEN 31–32', 'stop: verification needing a live write'],
  ['AGENTS.md', 'stop: another repository'],
  ['Commerce UX contract', 'stop: Commerce onboarding friction'],
  ['design.md', 'stop: design-contract change'],
  ['§4.1', 'stop: VTID allocator down'],
  ['Gate 1', 'stop: Gate 1 for Claude-local sparring'],
  ['STAGING-VERIFY', 'the default end point'],
  ['five-part', 'the stop message'],
  ['Never end a reply with an offer', 'the no-trailing-question rule'],
]);

function checkOwnerAutonomy(root) {
  const errors = [];
  const pipeline = path.join(root, '.kiro', 'steering', 'vitana-pipeline.md');
  if (!fs.existsSync(pipeline)) return errors;
  const file = path.join(root, OWNER_AUTONOMY);
  if (!fs.existsSync(file)) return [`${OWNER_AUTONOMY} missing (the standing owner instruction and its stop table)`];
  const text = fs.readFileSync(file, 'utf8');
  if (parseFrontMatter(frontMatter(text)).inclusion !== 'always') errors.push(`${OWNER_AUTONOMY}: inclusion must be always`);
  for (const [anchor, what] of OWNER_AUTONOMY_ANCHORS) {
    if (!text.includes(anchor)) errors.push(`${OWNER_AUTONOMY}: no longer names ${anchor} (${what})`);
  }
  if (!fs.readFileSync(pipeline, 'utf8').includes('vitana-owner-autonomy.md')) {
    errors.push('.kiro/steering/vitana-pipeline.md must point to vitana-owner-autonomy.md (the complete stop table)');
  }
  return errors;
}

module.exports = { check, checkOwnerAutonomy, OWNER_AUTONOMY_ANCHORS, parseFrontMatter, frontMatter, fileLinks };

if (require.main === module) {
  const errors = check(path.resolve(process.argv[2] || '.'));
  if (errors.length) {
    for (const e of errors) console.error(`kiro-steering: ${e}`);
    process.exit(1);
  }
  console.log('kiro-steering: OK');
}
