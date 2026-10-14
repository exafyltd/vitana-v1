// VTID-05157 — parity ledger: every failure mode of --check, --sync semantics,
// and the Expo Router file-name mapping. Fixture trees only; never the repo's ledger.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { load, sync, check, report, writeLedger, fileToRoute, PATHS } from '../parity-ledger.mjs';
import { tree } from './fixture.mjs';

const APP = `
import { Routes, Route, Navigate } from 'react-router-dom';
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/home" element={<Home />} />
      <Route path="/inbox/u/:recipient_id" element={<Conversation />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/privacy" element={<Privacy />} />
      <Route path="/old-home" element={<Navigate to="/home" replace />} />
      <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />
      <Route path="/staff/queue" element={<ProtectedRoute requiredRole="staff"><Queue /></ProtectedRoute>} />
      <Route path="/staff" element={<Navigate to="/staff/queue" />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
`;

const SCREENS = {
  version: 1,
  screens: [
    { id: 'PUBLIC.LANDING', route: '/', category: 'public', access: 'public' },
    { id: 'HOME.OVERVIEW', route: '/home', category: 'home', access: 'member' },
    { id: 'HOME.NEWS_ALL', route: '/home?tab=all', category: 'home', access: 'member' },
    { id: 'LIFE_COMPASS.OVERLAY', route: '/home', category: 'memory', access: 'member', overlay: { event: 'x', marker: 'y' } },
    { id: 'INBOX.CONVERSATION', route: '/inbox/u/:recipient_id', category: 'inbox', access: 'member' },
    { id: 'SETTINGS.PRIVACY', route: '/settings/privacy', mobileRoute: '/settings?mode=privacy', category: 'settings', access: 'member' },
  ],
};

const EXCLUSIONS = {
  prefixes: [
    { prefix: '/admin', reason: 'admin' },
    { prefix: '/staff', reason: 'staff' },
  ],
  paths: [
    { path: '/legal', reason: 'legal page' },
    { path: '/demo', reason: 'demo page' },
  ],
};

const RULES = {
  lanes: { 'home-feed': 'Home', inbox: 'Inbox', settings: 'Settings', public: 'Public', roles: 'Roles' },
  scope_prefixes: [
    { prefix: '/admin', scope: 'out:system-browser', reason: 'admin' },
    { prefix: '/staff', scope: 'in', reason: 'staff mode' },
  ],
  registry_access: { member: 'in', public: 'in' },
  paths: { '/legal': { scope: 'in', reason: 'legal' } },
  lane_rules: [
    { prefix: '/home', lane: 'home-feed' },
    { prefix: '/inbox', lane: 'inbox' },
    { prefix: '/settings', lane: 'settings' },
    { prefix: '/staff', lane: 'roles' },
    { prefix: '/', exact: true, lane: 'public' },
    { prefix: '/legal', lane: 'public' },
  ],
  lane_by_category: {},
};

function fixture({ rules = RULES, appFiles = ['index.tsx', '_layout.tsx', '+not-found.tsx'] } = {}) {
  const files = {
    [PATHS.app]: APP,
    [PATHS.screens]: SCREENS,
    [PATHS.exclusions]: EXCLUSIONS,
    [PATHS.scope]: rules,
  };
  for (const f of appFiles) files[`${PATHS.nativeApp}/${f}`] = 'export default function X() { return null; }\n';
  return tree(files);
}

function synced(opts) {
  const fx = fixture(opts);
  const { ledger } = sync(load(fx.root));
  writeLedger(fx.root, ledger);
  return fx;
}

const ledgerOf = (root) => JSON.parse(readFileSync(join(root, PATHS.ledger), 'utf8'));
const rowsByKey = (root) => new Map(ledgerOf(root).rows.map((r) => [r.key, r]));
const editLedger = (root, fn) => {
  const l = ledgerOf(root);
  fn(l);
  writeFileSync(join(root, PATHS.ledger), `${JSON.stringify(l, null, 2)}\n`);
};

test('a synced ledger passes --check except for the undecided exclusion (pending)', () => {
  const fx = synced();
  try {
    const failures = check(load(fx.root));
    assert.deepEqual(failures.length, 1);
    assert.match(failures[0], /^\(f\) row "\/demo" .*scope "pending"/);
  } finally { fx.cleanup(); }
});

test('a pending scope fails until decided in the rules, then passes', () => {
  const rules = { ...RULES, paths: { ...RULES.paths, '/demo': { scope: 'out:excluded', reason: 'internal demo' } } };
  const fx = synced({ rules });
  try {
    assert.deepEqual(check(load(fx.root)), []);
    assert.equal(rowsByKey(fx.root).get('/demo').scope, 'out:excluded');
    assert.equal(rowsByKey(fx.root).get('/demo').lane, null);
  } finally { fx.cleanup(); }
});

const DECIDED = { ...RULES, paths: { ...RULES.paths, '/demo': { scope: 'out:excluded', reason: 'internal demo' } } };

test('rows: redirects never rows, /admin is out:system-browser, tab variants separate, mobileRoute preferred, overlays', () => {
  const fx = synced({ rules: DECIDED });
  try {
    const rows = rowsByKey(fx.root);
    assert.ok(![...rows.values()].some((r) => r.web_path === '/old-home' || r.web_path === '/staff'), 'redirects are never rows');
    assert.ok(!rows.has('*'), 'the catch-all is never a row');
    assert.equal(rows.get('/admin/dashboard').scope, 'out:system-browser');
    assert.equal(rows.get('/admin/dashboard').source, 'role-route');
    assert.equal(rows.get('/staff/queue').scope, 'in');
    assert.equal(rows.get('/staff/queue').lane, 'roles');
    assert.ok(rows.has('HOME.OVERVIEW') && rows.has('HOME.NEWS_ALL'), 'tab variants on one path stay separate ids');
    assert.equal(rows.get('SETTINGS.PRIVACY').web_path, '/settings?mode=privacy');
    assert.equal(rows.get('LIFE_COMPASS.OVERLAY').kind, 'overlay');
    assert.equal(rows.get('HOME.OVERVIEW').kind, 'screen');
    assert.equal(rows.get('PUBLIC.LANDING').lane, 'public');
    assert.equal(rows.size, 6 + 2 + 2);
  } finally { fx.cleanup(); }
});

test('(a) a missing row fails with the --sync hint', () => {
  const fx = synced({ rules: DECIDED });
  try {
    editLedger(fx.root, (l) => { l.rows = l.rows.filter((r) => r.key !== 'HOME.NEWS_ALL'); });
    const f = check(load(fx.root));
    assert.equal(f.length, 1);
    assert.match(f[0], /^\(a\) registry "HOME.NEWS_ALL".*add a ledger row.*--sync/);
  } finally { fx.cleanup(); }
});

test('(b) a stale row fails, and so does a row whose derived fields drifted', () => {
  const fx = synced({ rules: DECIDED });
  try {
    editLedger(fx.root, (l) => {
      l.rows.push({ key: 'GONE.SCREEN', web_path: '/gone', kind: 'screen', source: 'registry', scope: 'in', lane: 'home-feed', status: 'not_started', exception: null, owner: null, last_parity_check: null });
      l.rows.find((r) => r.key === 'SETTINGS.PRIVACY').web_path = '/settings/privacy';
    });
    const f = check(load(fx.root));
    assert.equal(f.length, 2);
    assert.ok(f.some((x) => /^\(b\) row "GONE.SCREEN".*no longer exists/.test(x)));
    assert.ok(f.some((x) => /^\(b\) row "SETTINGS.PRIVACY" is out of date/.test(x)));
  } finally { fx.cleanup(); }
});

test('(c) native/in_progress without a native file route fails', () => {
  const fx = synced({ rules: DECIDED });
  try {
    editLedger(fx.root, (l) => { l.rows.find((r) => r.key === 'HOME.OVERVIEW').status = 'native'; });
    const f = check(load(fx.root));
    assert.equal(f.length, 1);
    assert.match(f[0], /^\(c\) row "HOME.OVERVIEW" is "native" but apps\/mobile\/app has no route for \/home/);
    mkdirSync(join(fx.root, PATHS.nativeApp, '(tabs)'), { recursive: true });
    writeFileSync(join(fx.root, PATHS.nativeApp, '(tabs)/home.tsx'), 'export default () => null;\n');
    assert.deepEqual(check(load(fx.root)), []);
  } finally { fx.cleanup(); }
});

test('(d) a native file route without a row fails; native_only with a reason passes', () => {
  const fx = synced({ rules: DECIDED });
  try {
    mkdirSync(join(fx.root, PATHS.nativeApp, 'native-only'), { recursive: true });
    writeFileSync(join(fx.root, PATHS.nativeApp, 'native-only/[id].tsx'), 'export default () => null;\n');
    let f = check(load(fx.root));
    assert.equal(f.length, 1);
    assert.match(f[0], /^\(d\) native route \/native-only\/:id/);
    editLedger(fx.root, (l) => { l.native_only = [{ path: '/native-only/:x', reason: '' }]; });
    f = check(load(fx.root));
    assert.equal(f.length, 1);
    assert.match(f[0], /^\(d\) native_only "\/native-only\/:x" has no reason/);
    editLedger(fx.root, (l) => { l.native_only = [{ path: '/native-only/:x', reason: 'device settings, no web page' }]; });
    assert.deepEqual(check(load(fx.root)), []);
  } finally { fx.cleanup(); }
});

test('(d) a native route matches its row by path shape (param names do not matter)', () => {
  const fx = synced({ rules: DECIDED, appFiles: ['index.tsx', 'inbox/u/[id].tsx'] });
  try {
    assert.deepEqual(check(load(fx.root)), []);
  } finally { fx.cleanup(); }
});

test('(e) exception or web_fallback without a reason fails', () => {
  const fx = synced({ rules: DECIDED });
  try {
    editLedger(fx.root, (l) => {
      l.rows.find((r) => r.key === '/legal').status = 'exception';
      l.rows.find((r) => r.key === 'HOME.NEWS_ALL').status = 'web_fallback';
    });
    const f = check(load(fx.root));
    assert.equal(f.length, 2);
    assert.ok(f.every((x) => /^\(e\) .* without a reason/.test(x)));
    editLedger(fx.root, (l) => {
      l.rows.find((r) => r.key === '/legal').exception = 'stays a web page';
      l.rows.find((r) => r.key === 'HOME.NEWS_ALL').exception = 'temporary in-app web view';
    });
    assert.deepEqual(check(load(fx.root)), []);
  } finally { fx.cleanup(); }
});

test('--sync is idempotent and never deletes a row past not_started', () => {
  const fx = synced({ rules: DECIDED });
  try {
    const first = readFileSync(join(fx.root, PATHS.ledger), 'utf8');
    const again = sync(load(fx.root));
    writeLedger(fx.root, again.ledger);
    assert.equal(readFileSync(join(fx.root, PATHS.ledger), 'utf8'), first);
    assert.deepEqual(again.changes, { added: [], updated: [], removed: [], kept_stale: [] });

    editLedger(fx.root, (l) => {
      const row = l.rows.find((r) => r.key === 'HOME.OVERVIEW');
      row.status = 'in_progress';
      row.owner = 'lane-home';
      l.rows.push({ key: 'OLD.A', web_path: '/a', kind: 'screen', source: 'registry', scope: 'in', lane: 'home-feed', status: 'not_started', exception: null, owner: null, last_parity_check: null });
      l.rows.push({ key: 'OLD.B', web_path: '/b', kind: 'screen', source: 'registry', scope: 'in', lane: 'home-feed', status: 'native', exception: null, owner: null, last_parity_check: null });
    });
    const r = sync(load(fx.root));
    assert.deepEqual(r.changes.removed, ['OLD.A']);
    assert.deepEqual(r.changes.kept_stale, ['OLD.B']);
    const kept = new Map(r.ledger.rows.map((x) => [x.key, x]));
    assert.equal(kept.get('HOME.OVERVIEW').status, 'in_progress', 'hand-kept fields survive');
    assert.equal(kept.get('HOME.OVERVIEW').owner, 'lane-home');
    assert.ok(kept.has('OLD.B') && !kept.has('OLD.A'));
  } finally { fx.cleanup(); }
});

test('Expo Router file names map to web paths', () => {
  assert.equal(fileToRoute('index.tsx'), '/');
  assert.equal(fileToRoute('(tabs)/home.tsx'), '/home');
  assert.equal(fileToRoute('(tabs)/(feed)/index.tsx'), '/');
  assert.equal(fileToRoute('inbox/u/[recipient_id].tsx'), '/inbox/u/:recipient_id');
  assert.equal(fileToRoute('earthlinks/[...rest].tsx'), '/earthlinks/*');
  assert.equal(fileToRoute('comm/index.ts'), '/comm');
  assert.equal(fileToRoute('_layout.tsx'), null);
  assert.equal(fileToRoute('(tabs)/_layout.tsx'), null);
  assert.equal(fileToRoute('+not-found.tsx'), null);
  assert.equal(fileToRoute('+html.tsx'), null);
  assert.equal(fileToRoute('README.md'), null);
});

// ── VTID-05186: the `shell` section (ledger version 2) ─────────────────────
const shellEntry = (over = {}) => ({
  key: 'TopAppBar',
  web_source: 'src/components/mobile/TopAppBar.tsx',
  native_source: 'apps/mobile/src/shell/components/TopAppBar.tsx',
  status: 'in_progress',
  exception: null,
  owner: 'N3 VTID-05186',
  last_parity_check: null,
  ...over,
});

test('shell section: a valid version-2 entry passes; --report prints the shell table', () => {
  const fx = synced({ rules: DECIDED });
  try {
    mkdirSync(join(fx.root, 'src/components/mobile'), { recursive: true });
    mkdirSync(join(fx.root, 'apps/mobile/src/shell/components'), { recursive: true });
    writeFileSync(join(fx.root, 'src/components/mobile/TopAppBar.tsx'), 'export {};\n');
    writeFileSync(join(fx.root, 'apps/mobile/src/shell/components/TopAppBar.tsx'), 'export {};\n');
    editLedger(fx.root, (l) => {
      l.version = 2;
      l.shell = [shellEntry()];
    });
    assert.deepEqual(check(load(fx.root)), []);
    assert.match(report(load(fx.root)), /### Shell — 1 entries[\s\S]*\| TopAppBar \| in_progress \|/);
  } finally { fx.cleanup(); }
});

test('shell section: (g) missing web_source, (h) in_progress without native_source, (e) exception without reason', () => {
  const fx = synced({ rules: DECIDED });
  try {
    editLedger(fx.root, (l) => {
      l.version = 2;
      l.shell = [
        shellEntry({ key: 'A', web_source: 'src/gone.tsx', native_source: 'apps/mobile/src/missing.tsx' }),
        shellEntry({ key: 'B', web_source: 'src/App.tsx', status: 'exception', exception: ' ' }),
      ];
    });
    const f = check(load(fx.root));
    assert.ok(f.some((x) => /^\(g\) shell "A": web_source src\/gone\.tsx does not exist/.test(x)), f.join('\n'));
    assert.ok(f.some((x) => /^\(h\) shell "A" is "in_progress" but native_source/.test(x)), f.join('\n'));
    assert.ok(f.some((x) => /^\(e\) shell "B" is "exception" without a reason/.test(x)), f.join('\n'));
  } finally { fx.cleanup(); }
});

test('ledger versions: 1 without a shell section passes, a shell section needs 2, version 3 is rejected', () => {
  const fx = synced({ rules: DECIDED });
  try {
    assert.equal(ledgerOf(fx.root).version, 1);
    assert.deepEqual(check(load(fx.root)), []);
    editLedger(fx.root, (l) => {
      l.shell = [];
    });
    assert.match(check(load(fx.root))[0], /^\(v\) a "shell" section needs ledger version 2/);
    editLedger(fx.root, (l) => {
      l.version = 3;
      delete l.shell;
    });
    assert.match(check(load(fx.root))[0], /^\(v\) ledger version 3 is not supported/);
  } finally { fx.cleanup(); }
});
