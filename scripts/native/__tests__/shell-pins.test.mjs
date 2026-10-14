// VTID-05186 — check-shell-pins: AST pins (changed text fails, whitespace/comment-only edits pass)
// and the guest-path comparison. Fixture trees only; the repo check runs in NATIVE-CI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { check, pinText, sha256, allowGuestPaths, exportedStringArray, REPO } from '../check-shell-pins.mjs';
import { tree } from './fixture.mjs';

const WEB = `
import { useState } from 'react';
export function Drawer({ open }: { open: boolean }) {
  const [x] = useState(0);
  // a comment
  const rows = items.filter((i) => i.id !== 'wallet').map((i) => i.id);
  const isActive = (route: string) => route === '/discover';
  return null;
}
export const PREFIXES = ['/home', '/comm'];
`;

const APP = `
export default function App() {
  return (
    <Routes>
      <Route path="/discover" element={<AuthGuard allowGuest><Discover /></AuthGuard>} />
      <Route path="/home" element={<AuthGuard><Home /></AuthGuard>} />
      <Route path="/commerce/join" element={<CommerceJoin />} />
      <Route path="/e/game/:slug" element={
        <AuthGuard allowGuest><Game /></AuthGuard>
      } />
    </Routes>
  );
}
`;

const GUEST = `export const GUEST_PATHS: readonly string[] = ['/discover', '/e/game/:slug'];\n`;

function fixture(overrides = {}) {
  const pins = [
    { id: 'rows', web: 'src/Drawer.tsx', declaration: 'Drawer', inner: ['rows'], native: 'apps/mobile/src/shell/logic/drawer.ts' },
    { id: 'prefixes', web: 'src/Drawer.tsx', declaration: 'PREFIXES', native: 'apps/mobile/src/shell/logic/drawer.ts' },
  ];
  const t = tree({
    'src/Drawer.tsx': WEB,
    'src/App.tsx': APP,
    'apps/mobile/src/shell/logic/drawer.ts': 'export {};\n',
    'apps/mobile/src/navigation/guest-paths.ts': GUEST,
    ...overrides,
  });
  for (const p of pins) p.sha256 = sha256(pinText(t.root, p).text);
  writeFileSync(
    join(t.root, 'scripts/native/shell-pins.json'.replace(/^/, '')),
    JSON.stringify({ version: 1, pins, guest_paths: { web: 'src/App.tsx', native: 'apps/mobile/src/navigation/guest-paths.ts', export: 'GUEST_PATHS' } }),
  );
  return t;
}

test('a fresh fixture passes', () => {
  const t = fixture({ 'scripts/native/.keep': '' });
  try {
    assert.deepEqual(check(t.root), []);
  } finally {
    t.cleanup();
  }
});

test('a changed AST text fails, naming the file, the declaration and the native file', () => {
  const t = fixture({ 'scripts/native/.keep': '' });
  try {
    writeFileSync(join(t.root, 'src/Drawer.tsx'), WEB.replace("i.id !== 'wallet'", "i.id !== 'wallet' && i.id !== 'orders'"));
    const failures = check(t.root);
    assert.equal(failures.length, 1);
    assert.match(failures[0], /pin "rows" \(src\/Drawer\.tsx → Drawer › rows\)/);
    assert.match(failures[0], /web shell rule changed — update apps\/mobile\/src\/shell\/logic\/drawer\.ts and its pin/);
  } finally {
    t.cleanup();
  }
});

test('whitespace- and comment-only edits pass', () => {
  const t = fixture({ 'scripts/native/.keep': '' });
  try {
    const edited = WEB.replace('// a comment', '/* reworded\n     comment */')
      .replace("items.filter((i) => i.id !== 'wallet')", "items\n    .filter((i) =>   i.id !== 'wallet' )  // trailing\n   ")
      .replace("['/home', '/comm']", "[\n  '/home',\n  '/comm',\n]");
    writeFileSync(join(t.root, 'src/Drawer.tsx'), edited);
    assert.deepEqual(check(t.root), []);
  } finally {
    t.cleanup();
  }
});

test('a removed inner declaration or a missing web file fails', () => {
  const t = fixture({ 'scripts/native/.keep': '' });
  try {
    writeFileSync(join(t.root, 'src/Drawer.tsx'), WEB.replace('const rows =', 'const list ='));
    assert.match(check(t.root)[0], /"Drawer" no longer declares "rows"/);
  } finally {
    t.cleanup();
  }
});

test('guest paths: the hand list must equal the <AuthGuard allowGuest> routes', () => {
  assert.deepEqual(allowGuestPaths(APP), ['/discover', '/e/game/:slug']);
  assert.deepEqual(exportedStringArray(GUEST, 'GUEST_PATHS'), ['/discover', '/e/game/:slug']);
  const t = fixture({ 'scripts/native/.keep': '', 'apps/mobile/src/navigation/guest-paths.ts': "export const GUEST_PATHS = ['/discover', '/home'];\n" });
  try {
    const f = check(t.root);
    assert.equal(f.length, 1);
    assert.match(f[0], /missing \/e\/game\/:slug/);
    assert.match(f[0], /not guest on the web \/home/);
  } finally {
    t.cleanup();
  }
});

test('the repo pins and guest paths are current', () => {
  assert.deepEqual(check(REPO), []);
});
