#!/usr/bin/env node
/**
 * VTID-05157 — native parity ledger (Native app Wave 0, plan changes 10–11;
 * program docs/programs/native-app/NATIVE-APP-PLAN.md §4).
 *
 * Every web destination gets one row in apps/mobile/parity/ledger.json:
 *   - every screens.json screen (keyed by id; overlays are kind "overlay")
 *   - every exclusions.json path
 *   - every App.tsx page route under an exclusion prefix (role and business
 *     routes), redirects / index / catch-all removed
 * Scope and lane come from scripts/native/parity-scope.json; the hand-kept
 * fields (status, exception, owner, last_parity_check) live only in the ledger.
 *
 *   node scripts/native/parity-ledger.mjs --check    fail on any drift (CI)
 *   node scripts/native/parity-ledger.mjs --sync     add missing rows, refresh derived fields
 *   node scripts/native/parity-ledger.mjs --report   counts by scope × lane × status
 *   [--root <repo root>]                              (fixture trees in tests)
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractSpaRoutes } from '../nav/spa-routes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, '../..');

export const PATHS = {
  app: 'src/App.tsx',
  screens: 'src/navigation/registry/screens.json',
  exclusions: 'src/navigation/registry/exclusions.json',
  scope: 'scripts/native/parity-scope.json',
  ledger: 'apps/mobile/parity/ledger.json',
  nativeApp: 'apps/mobile/app',
};

export const STATUSES = ['not_started', 'in_progress', 'native', 'web_fallback', 'exception'];
export const SCOPES = ['in', 'out:system-browser', 'out:excluded', 'out:retired', 'pending'];
const SOURCE_ORDER = { registry: 0, exclusion: 1, 'role-route': 2 };
const CATCH_ALL = new Set(['*', '/*']);
const SYNC_HINT = 'run `node scripts/native/parity-ledger.mjs --sync`';

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** Registry semantics (registry.routes.test.ts): /x, /x/…, /x-… */
export function underExclusionPrefix(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}-`);
}

function underPrefix(path, rule) {
  if (rule.exact || rule.prefix === '/') return path === rule.prefix;
  return path === rule.prefix || path.startsWith(`${rule.prefix}/`);
}

export const stripQuery = (p) => p.split('?')[0];

/** Path shape used to match web paths and native routes: query dropped, every param is ":". */
export function shapeOf(path) {
  const p = stripQuery(path).replace(/\/+$/, '') || '/';
  return p.replace(/:[^/]+/g, ':');
}

// ── Expected set ──────────────────────────────────────────────────────────
export function expectedEntries({ screens, exclusions, routes }) {
  const out = [];
  const keys = new Set();
  const add = (e) => {
    if (keys.has(e.key)) return;
    keys.add(e.key);
    out.push(e);
  };
  for (const s of screens.screens) {
    add({
      key: s.id,
      web_path: s.mobileRoute ?? s.route,
      kind: s.overlay ? 'overlay' : 'screen',
      source: 'registry',
      access: s.access,
      category: s.category,
    });
  }
  const excludedPaths = new Set(exclusions.paths.map((p) => p.path));
  for (const p of exclusions.paths) add({ key: p.path, web_path: p.path, kind: 'route', source: 'exclusion' });
  const registryShapes = new Set(screens.screens.map((s) => shapeOf(s.route)));
  for (const r of routes) {
    if (r.redirectTo || r.index || CATCH_ALL.has(r.path)) continue;
    if (!exclusions.prefixes.some((p) => underExclusionPrefix(r.path, p.prefix))) continue;
    if (excludedPaths.has(r.path) || registryShapes.has(shapeOf(r.path))) continue;
    add({ key: r.path, web_path: r.path, kind: 'route', source: 'role-route', ...(r.requiredRole ? { requiredRole: r.requiredRole } : {}) });
  }
  return out;
}

// ── Scope and lane ────────────────────────────────────────────────────────
export function scopeOf(entry, rules) {
  const path = stripQuery(entry.web_path);
  const override = rules.paths?.[path] ?? rules.paths?.[entry.key];
  if (override?.scope) return override.scope;
  const prefix = (rules.scope_prefixes || []).find((p) => underExclusionPrefix(path, p.prefix));
  if (prefix) return prefix.scope;
  if (entry.source === 'registry' && rules.registry_access?.[entry.access]) return rules.registry_access[entry.access];
  return 'pending';
}

export function laneOf(entry, scope, rules) {
  if (scope !== 'in') return null;
  const path = stripQuery(entry.web_path);
  const override = rules.paths?.[path] ?? rules.paths?.[entry.key];
  if (override?.lane) return override.lane;
  const hits = (rules.lane_rules || []).filter((r) => underPrefix(path, r));
  if (hits.length) return hits.sort((a, b) => b.prefix.length - a.prefix.length)[0].lane;
  if (entry.category && rules.lane_by_category?.[entry.category]) return rules.lane_by_category[entry.category];
  return null;
}

function derived(entry, rules) {
  const scope = scopeOf(entry, rules);
  return { key: entry.key, web_path: entry.web_path, kind: entry.kind, source: entry.source, scope, lane: laneOf(entry, scope, rules) };
}

const DERIVED_FIELDS = ['web_path', 'kind', 'source', 'scope', 'lane'];

// ── Native routes (Expo Router file names) ─────────────────────────────────
/** app/(tabs)/inbox/[id].tsx → /inbox/:id ; [...rest] → * ; index → parent. Null for non-routes. */
export function fileToRoute(relFile) {
  const noExt = relFile.split(sep).join('/').replace(/\.(tsx|ts|jsx|js)$/, '');
  if (noExt === relFile.split(sep).join('/')) return null;
  const segs = noExt.split('/');
  const last = segs[segs.length - 1];
  if (last === '_layout' || last.startsWith('+')) return null;
  const parts = [];
  for (const s of segs) {
    if (/^\(.*\)$/.test(s)) continue;
    if (s === 'index') continue;
    const catchAll = s.match(/^\[\.\.\.(.+)\]$/);
    if (catchAll) { parts.push('*'); continue; }
    const param = s.match(/^\[(.+)\]$/);
    parts.push(param ? `:${param[1]}` : s);
  }
  return `/${parts.join('/')}`;
}

export function nativeRoutes(appDir) {
  if (!existsSync(appDir)) return [];
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else {
        const route = fileToRoute(relative(appDir, full));
        if (route) out.push({ route, file: relative(appDir, full).split(sep).join('/') });
      }
    }
  };
  walk(appDir);
  return out;
}

// ── Load / sync / check ───────────────────────────────────────────────────
export function load(root = REPO) {
  const p = (k) => join(root, PATHS[k]);
  const routes = extractSpaRoutes(readFileSync(p('app'), 'utf8'));
  const inputs = { screens: readJson(p('screens')), exclusions: readJson(p('exclusions')), routes };
  const rules = readJson(p('scope'));
  const ledger = existsSync(p('ledger')) ? readJson(p('ledger')) : null;
  return { expected: expectedEntries(inputs), rules, ledger, native: nativeRoutes(p('nativeApp')) };
}

function sortRows(rows) {
  return [...rows].sort((a, b) => (SOURCE_ORDER[a.source] ?? 9) - (SOURCE_ORDER[b.source] ?? 9) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

const emptyLedger = () => ({
  _comment: 'VTID-05157 — native parity ledger, one row per web destination (program §4). Rows are added by `node scripts/native/parity-ledger.mjs --sync`; scope/lane come from scripts/native/parity-scope.json. Edit only status, exception, owner and last_parity_check by hand. NATIVE-CI runs --check.',
  version: 1,
  native_only: [],
  rows: [],
});

/** Adds missing rows, refreshes derived fields, drops stale rows that are still not_started. */
export function sync({ expected, rules, ledger }) {
  const base = ledger ?? emptyLedger();
  const byKey = new Map((base.rows || []).map((r) => [r.key, r]));
  const expectedKeys = new Set(expected.map((e) => e.key));
  const rows = [];
  const changes = { added: [], updated: [], removed: [], kept_stale: [] };
  for (const e of expected) {
    const d = derived(e, rules);
    const old = byKey.get(e.key);
    if (!old) {
      rows.push({ ...d, status: 'not_started', exception: null, owner: null, last_parity_check: null });
      changes.added.push(e.key);
      continue;
    }
    const row = { ...old, ...d };
    if (DERIVED_FIELDS.some((f) => old[f] !== row[f])) changes.updated.push(e.key);
    rows.push(row);
  }
  for (const r of base.rows || []) {
    if (expectedKeys.has(r.key)) continue;
    if (r.status === 'not_started') changes.removed.push(r.key);
    else { rows.push(r); changes.kept_stale.push(r.key); }
  }
  return { ledger: { ...base, rows: sortRows(rows) }, changes };
}

export function check({ expected, rules, ledger, native }) {
  const failures = [];
  const fail = (code, msg) => failures.push(`(${code}) ${msg}`);
  if (!ledger) return [`(a) no ledger at ${PATHS.ledger} — ${SYNC_HINT}`];
  const rows = ledger.rows || [];
  const byKey = new Map();
  for (const r of rows) {
    if (byKey.has(r.key)) fail('b', `duplicate row "${r.key}"`);
    byKey.set(r.key, r);
  }
  const expectedByKey = new Map(expected.map((e) => [e.key, e]));

  for (const e of expected) {
    if (!byKey.has(e.key)) fail('a', `${e.source} "${e.key}" (${e.web_path}) has no ledger row — add a ledger row — ${SYNC_HINT}`);
  }
  for (const r of rows) {
    const e = expectedByKey.get(r.key);
    if (!e) { fail('b', `row "${r.key}" (${r.web_path}) points at a web destination that no longer exists — remove the row`); continue; }
    const d = derived(e, rules);
    const drift = DERIVED_FIELDS.filter((f) => r[f] !== d[f]);
    if (drift.length) fail('b', `row "${r.key}" is out of date (${drift.map((f) => `${f}: ${JSON.stringify(r[f])} → ${JSON.stringify(d[f])}`).join(', ')}) — ${SYNC_HINT}`);
  }

  const nativeShapes = new Set(native.map((n) => shapeOf(n.route)));
  for (const r of rows) {
    if (!STATUSES.includes(r.status)) fail('e', `row "${r.key}" has unknown status ${JSON.stringify(r.status)} (allowed: ${STATUSES.join(', ')})`);
    if ((r.status === 'native' || r.status === 'in_progress') && !nativeShapes.has(shapeOf(r.web_path))) {
      fail('c', `row "${r.key}" is "${r.status}" but apps/mobile/app has no route for ${stripQuery(r.web_path)}`);
    }
    if ((r.status === 'exception' || r.status === 'web_fallback') && !(typeof r.exception === 'string' && r.exception.trim())) {
      fail('e', `row "${r.key}" is "${r.status}" without a reason in "exception"`);
    }
    if (r.scope === 'pending' || !SCOPES.includes(r.scope)) fail('f', `row "${r.key}" (${r.web_path}) has scope "${r.scope}" — decide it in ${PATHS.scope}, then ${SYNC_HINT}`);
    else if (r.scope === 'in' && !r.lane) fail('f', `row "${r.key}" (${r.web_path}) is in scope without a lane — add a lane rule in ${PATHS.scope}, then ${SYNC_HINT}`);
    else if (r.lane && !rules.lanes?.[r.lane]) fail('f', `row "${r.key}" has unknown lane "${r.lane}"`);
  }

  const rowShapes = new Set(rows.map((r) => shapeOf(r.web_path)));
  const nativeOnly = new Map((ledger.native_only || []).map((n) => [shapeOf(n.path), n]));
  for (const n of ledger.native_only || []) {
    if (!(typeof n.reason === 'string' && n.reason.trim())) fail('d', `native_only "${n.path}" has no reason`);
  }
  for (const n of native) {
    const s = shapeOf(n.route);
    if (!rowShapes.has(s) && !nativeOnly.has(s)) fail('d', `native route ${n.route} (app/${n.file}) has no ledger row — add it to a row's web destination or to "native_only" with a reason`);
  }
  return failures;
}

export function report({ ledger }) {
  const rows = ledger?.rows || [];
  const count = (f) => rows.reduce((m, r) => ((m[f(r)] = (m[f(r)] || 0) + 1), m), {});
  const lines = [`### Native parity ledger — ${rows.length} rows`, ''];
  lines.push('| scope | rows |', '|---|---|');
  for (const [k, v] of Object.entries(count((r) => r.scope)).sort()) lines.push(`| ${k} | ${v} |`);
  lines.push('', '| lane (scope in) | not_started | in_progress | native | web_fallback | exception | total |', '|---|---|---|---|---|---|---|');
  const lanes = {};
  for (const r of rows.filter((x) => x.scope === 'in')) {
    const l = (lanes[r.lane ?? '(none)'] ||= Object.fromEntries(STATUSES.map((s) => [s, 0])));
    l[r.status] = (l[r.status] || 0) + 1;
  }
  for (const [lane, c] of Object.entries(lanes).sort()) {
    lines.push(`| ${lane} | ${STATUSES.map((s) => c[s] || 0).join(' | ')} | ${Object.values(c).reduce((a, b) => a + b, 0)} |`);
  }
  lines.push('', `native_only: ${(ledger?.native_only || []).map((n) => n.path).join(', ') || '—'}`);
  return lines.join('\n');
}

export function writeLedger(root, ledger) {
  const file = join(root, PATHS.ledger);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(ledger, null, 2)}\n`);
}

// ── CLI ───────────────────────────────────────────────────────────────────
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--root');
  const root = i >= 0 ? resolve(args[i + 1]) : REPO;
  const state = load(root);
  let code = 0;
  if (args.includes('--sync')) {
    const { ledger, changes } = sync(state);
    writeLedger(root, ledger);
    state.ledger = ledger;
    console.log(`parity-ledger --sync: ${ledger.rows.length} rows (added ${changes.added.length}, updated ${changes.updated.length}, removed ${changes.removed.length}, stale kept ${changes.kept_stale.length})`);
    for (const k of changes.kept_stale) console.log(`  stale row kept (status is past not_started, remove it by hand): ${k}`);
  }
  if (args.includes('--check')) {
    const failures = check(state);
    if (failures.length) {
      console.error(`parity-ledger --check: ${failures.length} problem(s)`);
      for (const f of failures) console.error(`  ${f}`);
      code = 1;
    } else {
      console.log(`parity-ledger --check: OK — ${state.ledger.rows.length} rows, ${state.native.length} native route(s)`);
    }
  }
  if (args.includes('--report')) {
    const md = report(state);
    console.log(md);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
  }
  if (!['--sync', '--check', '--report'].some((a) => args.includes(a))) {
    console.error('usage: parity-ledger.mjs --check | --sync | --report [--root <dir>]');
    code = 2;
  }
  process.exit(code);
}
