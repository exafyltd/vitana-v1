/**
 * VTID-04733 — publish the "What's New" manifest with the build.
 *
 * Merges src/whats-new/entries/*.json (one file per user-facing change, so
 * concurrent PRs never conflict) into public/whats-new.json, which Vite copies
 * into dist/ and the app serves at /whats-new.json. The gateway's daily
 * whats-new job reads it from the PRODUCTION frontend, so an entry can only
 * become a "Brand New Feature" News Feed card once the build that carries it
 * is live for members — never at merge, never on staging.
 *
 * Runs as part of `prebuild` and standalone via `npm run whats-new`. A
 * malformed entry fails the build: a bad manifest must never reach production
 * silently, because the gateway would just skip it.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENTRIES = path.join(ROOT, 'src', 'whats-new', 'entries');
const REG = path.join(ROOT, 'src', 'navigation', 'registry');
const OUT = path.join(ROOT, 'public', 'whats-new.json');

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TITLE = 60;
const MAX_DESCRIPTION = 220;

function knownPaths() {
  const screens = JSON.parse(fs.readFileSync(path.join(REG, 'screens.json'), 'utf8')).screens;
  const excl = JSON.parse(fs.readFileSync(path.join(REG, 'exclusions.json'), 'utf8'));
  const exact = new Set();
  for (const s of screens) {
    exact.add(s.route.split('?')[0]);
    if (s.mobileRoute) exact.add(s.mobileRoute.split('?')[0]);
  }
  for (const p of excl.paths ?? []) exact.add(p.path);
  return { exact, prefixes: (excl.prefixes ?? []).map((p) => p.prefix) };
}

function localizedProblems(field, value, max) {
  if (!value || typeof value !== 'object') return [`${field} must be an object with en and de`];
  const out = [];
  for (const l of ['en', 'de']) {
    if (typeof value[l] !== 'string' || !value[l].trim()) out.push(`${field}.${l} is required`);
  }
  for (const [l, v] of Object.entries(value)) {
    if (typeof v !== 'string') out.push(`${field}.${l} must be a string`);
    else if (v.length > max) out.push(`${field}.${l} is ${v.length} chars (max ${max})`);
  }
  // DE is du-form (platform + community-app i18n rule).
  if (typeof value.de === 'string' && /\b(Sie|Ihr|Ihre|Ihnen)\b/.test(value.de)) {
    out.push(`${field}.de uses Sie/Ihr — brand voice is du-form`);
  }
  return out;
}

/** Returns a list of problems for one entry; empty means usable. */
export function validateEntry(entry, file, paths = knownPaths(), seen = new Set()) {
  const p = [];
  if (!entry || typeof entry !== 'object') return [`${file}: not an object`];
  if (typeof entry.id !== 'string' || !ID_RE.test(entry.id)) p.push('id must be kebab-case');
  else if (`${entry.id}.json` !== path.basename(file)) p.push('id must match the file name');
  else if (seen.has(entry.id)) p.push(`duplicate id ${entry.id}`);
  if (typeof entry.added !== 'string' || !DATE_RE.test(entry.added) || Number.isNaN(Date.parse(entry.added))) {
    p.push('added must be a YYYY-MM-DD date');
  }
  p.push(...localizedProblems('title', entry.title, MAX_TITLE));
  p.push(...localizedProblems('description', entry.description, MAX_DESCRIPTION));
  const link = entry.deepLink;
  if (typeof link !== 'string' || !link.startsWith('/') || link.startsWith('//') || /[\s?#]/.test(link)) {
    // Path-based only: a query string does not survive an Appilix WebView
    // notification tap (same constraint as the gateway's feature tips).
    p.push('deepLink must be an in-app path (no query, no hash)');
  } else if (!paths.exact.has(link) && !paths.prefixes.some((x) => link.startsWith(x))) {
    p.push(`deepLink ${link} is not a known route (screens.json / exclusions.json)`);
  }
  return p.map((m) => `${path.basename(file)}: ${m}`);
}

export function buildManifest() {
  const paths = knownPaths();
  const files = fs.existsSync(ENTRIES) ? fs.readdirSync(ENTRIES).filter((f) => f.endsWith('.json')).sort() : [];
  const problems = [];
  const entries = [];
  const seen = new Set();
  for (const f of files) {
    let entry;
    try {
      entry = JSON.parse(fs.readFileSync(path.join(ENTRIES, f), 'utf8'));
    } catch (e) {
      problems.push(`${f}: invalid JSON (${e.message})`);
      continue;
    }
    const errs = validateEntry(entry, f, paths, seen);
    if (errs.length) problems.push(...errs);
    else {
      seen.add(entry.id);
      entries.push({ id: entry.id, added: entry.added, title: entry.title, description: entry.description, deepLink: entry.deepLink });
    }
  }
  if (problems.length) throw new Error(`[whats-new] invalid entries:\n  ${problems.join('\n  ')}`);
  entries.sort((a, b) => a.added.localeCompare(b.added) || a.id.localeCompare(b.id));
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    commit: process.env.VITE_APP_VERSION || process.env.GITHUB_SHA || null,
    entries,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const m = buildManifest();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(m));
  console.log(`[whats-new] ${m.entries.length} entries → ${path.relative(ROOT, OUT)}`);
}
