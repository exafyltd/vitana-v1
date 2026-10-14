// VTID-05183 — the single extraction generator on fixture trees.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { build, run, isPureLiteral } from '../gen-core-extract.mjs';
import { tree } from './fixture.mjs';

const RULES = `import { Mail, Home, type LucideIcon } from 'lucide-react';
import flagDe from '@/assets/flags/de.png';
import { getHubUrl } from '@/config/hub';
import { helper } from '@/lib/pure';

export type Role = 'a' | 'b';

/** Doc comment kept. */
export const ROLES: Role[] = ['a', 'b'];

// line comment kept
const isRole = (r: string): r is Role => (ROLES as string[]).includes(r);

export interface Item { id: string; icon: LucideIcon; path: string }

export const ITEMS: Item[] = [{ id: 'mail', icon: Mail, path: '/inbox' }, { id: 'home', icon: Home, path: '/' }];

export const FLAGS = { de: flagDe };

export function destination(role: Role): string {
  if (role === 'b') return getHubUrl() || '/home';
  return isRole(role) ? '/a' : '/x';
}

export const doubled = (n: number) => helper(n) * 2;
`;

const COMPONENT = `import { useState } from 'react';
import type { Role } from '@/lib/rules';
export const roleLabel = (r: Role) => r.toUpperCase();
export function Nav() {
  const [x] = useState(0);
  const hidden = ['/a', '/b'];
  const computed = [x, 1];
  return hidden.length + computed.length;
}
`;

const base = {
  'src/lib/rules.ts': RULES,
  'src/lib/pure.ts': 'export const helper = (n: number) => n + 1;\n',
  'src/config/hub.ts': 'export const getHubUrl = () => import.meta.env.VITE_HUB;\n',
  'src/lib/toast.ts': "import { toast } from 'sonner';\nexport const notify = toast;\n",
  'src/lib/uses-toast.ts': "import { notify } from '@/lib/toast';\nexport const say = (m: string) => notify(m);\n",
  'src/components/Nav.tsx': COMPONENT,
  'src/assets/flags/de.png': 'png',
};

const extract = (entries) => ({ 'packages/core/extract.json': { entries } });

const GOOD = {
  rules: {
    iconFields: ['icon'],
    sources: [{
      file: 'src/lib/rules.ts',
      take: ['Role', 'ROLES', 'isRole', 'Item', 'ITEMS', 'FLAGS', 'destination', 'doubled'],
      stubs: { getHubUrl: { expression: '() => null', reason: 'unreachable on mobile' } },
    }],
  },
  nav: { sources: [{ file: 'src/components/Nav.tsx', take: ['roleLabel', { name: 'Nav#hidden', as: 'hiddenRoutes' }] }] },
};

test('verbatim copy of consts and functions, with comments, exports added, cross-entry and kept imports', () => {
  const fx = tree({ ...base, ...extract(GOOD) });
  try {
    const { files, assets, icons } = build(fx.root);
    const rules = files['packages/core/src/extracted/rules.generated.ts'];
    assert.match(rules, /\/\*\* Doc comment kept\. \*\/\nexport const ROLES: Role\[\] = \['a', 'b'\];/);
    assert.match(rules, /\/\/ line comment kept\nexport const isRole = \(r: string\): r is Role => \(ROLES as string\[\]\)\.includes\(r\);/);
    assert.match(rules, /import \{ helper \} from '@\/lib\/pure';/, 'a class-A import is kept');
    assert.match(rules, /\/\/ {3}src\/lib\/rules\.ts \(sha256 [0-9a-f]{16}\)/);
    const nav = files['packages/core/src/extracted/nav.generated.ts'];
    assert.match(nav, /import type \{ Role \} from '\.\/rules\.generated';/);
    assert.match(nav, /export const roleLabel = \(r: Role\) => r\.toUpperCase\(\);/);
    assert.deepEqual(icons, ['Home', 'Mail']);
    assert.deepEqual(assets, ['src/assets/flags/de.png']);
  } finally { fx.cleanup(); }
});

test('Function#name takes an inner literal const and fails when it is not a pure literal', () => {
  const fx = tree({ ...base, ...extract(GOOD) });
  try {
    const nav = build(fx.root).files['packages/core/src/extracted/nav.generated.ts'];
    assert.match(nav, /^const hidden = \['\/a', '\/b'\];\nexport \{ hidden as hiddenRoutes \};$/m);
  } finally { fx.cleanup(); }
  const bad = tree({ ...base, ...extract({ nav: { sources: [{ file: 'src/components/Nav.tsx', take: ['Nav#computed'] }] } }) });
  try {
    assert.throws(() => build(bad.root), /Nav#computed in src\/components\/Nav\.tsx is not a const with a pure literal initializer/);
  } finally { bad.cleanup(); }
  assert.equal(isPureLiteral({ kind: 0 }), false);
});

test('an asset import becomes its path, appears in the asset map', () => {
  const fx = tree({ ...base, ...extract(GOOD) });
  try {
    const { files } = build(fx.root);
    assert.match(files['packages/core/src/extracted/rules.generated.ts'], /export const FLAGS = \{ de: 'src\/assets\/flags\/de\.png' \};/);
    assert.match(files['packages/core/src/extracted/assets.generated.ts'], /'src\/assets\/flags\/de\.png': require\('\.\.\/\.\.\/\.\.\/\.\.\/src\/assets\/flags\/de\.png'\),/);
  } finally { fx.cleanup(); }
});

test('icon rewrite: value becomes a string, the field type becomes IconName', () => {
  const fx = tree({ ...base, ...extract(GOOD) });
  try {
    const { files } = build(fx.root);
    const rules = files['packages/core/src/extracted/rules.generated.ts'];
    assert.match(rules, /export interface Item \{ id: string; icon: IconName; path: string \}/);
    assert.match(rules, /\{ id: 'mail', icon: 'Mail', path: '\/inbox' \}/);
    assert.match(rules, /import type \{ IconName \} from '\.\/icons\.generated';/);
    assert.match(files['packages/core/src/extracted/icons.generated.ts'], /export const ICON_NAMES = \[\n {2}'Home',\n {2}'Mail',\n\] as const;/);
  } finally { fx.cleanup(); }
});

test('a stub is applied only where listed; an unused stub fails', () => {
  const fx = tree({ ...base, ...extract(GOOD) });
  try {
    const rules = build(fx.root).files['packages/core/src/extracted/rules.generated.ts'];
    assert.match(rules, /if \(role === 'b'\) return \(\(\) => null\)\(\) \|\| '\/home';/);
    assert.doesNotMatch(rules, /getHubUrl/);
  } finally { fx.cleanup(); }
  const unused = structuredClone(GOOD);
  unused.rules.sources[0].stubs.never = { expression: '0', reason: 'r' };
  const fx2 = tree({ ...base, ...extract(unused) });
  try { assert.throws(() => build(fx2.root), /stub never for src\/lib\/rules\.ts is never used/); } finally { fx2.cleanup(); }
  const nostub = structuredClone(GOOD);
  delete nostub.rules.sources[0].stubs;
  const fx3 = tree({ ...base, ...extract(nostub) });
  try { assert.throws(() => build(fx3.root), /references getHubUrl, imported from @\/config\/hub \(src\/config\/hub\.ts\), which is class B/); } finally { fx3.cleanup(); }
});

test('an unknown free identifier and an unextracted sibling fail', () => {
  const fx = tree({ ...base, 'src/lib/free.ts': 'export const f = () => mystery + 1;\nconst local = 1;\nexport const g = () => local;\n', ...extract({ free: { sources: [{ file: 'src/lib/free.ts', take: ['f', 'g'] }] } }) });
  try {
    assert.throws(() => build(fx.root), (e) => /references the unknown free identifier mystery/.test(e.message) && /references local, a declaration of the same file that is not extracted/.test(e.message));
  } finally { fx.cleanup(); }
});

test('a referenced class-C import fails', () => {
  const fx = tree({ ...base, 'src/lib/c.ts': "import { say } from '@/lib/uses-toast';\nexport const hello = () => say('x');\n", ...extract({ c: { sources: [{ file: 'src/lib/c.ts', take: ['hello'] }] } }) });
  try {
    assert.throws(() => build(fx.root), /references say, imported from @\/lib\/uses-toast \(src\/lib\/uses-toast\.ts\), which is class C via src\/lib\/uses-toast\.ts → src\/lib\/toast\.ts/);
  } finally { fx.cleanup(); }
  const pkg = tree({ ...base, 'src/lib/p.ts': "import { toast } from 'sonner';\nexport const t = () => toast;\n", ...extract({ p: { sources: [{ file: 'src/lib/p.ts', take: ['t'] }] } }) });
  try { assert.throws(() => build(pkg.root), /imported from package sonner/); } finally { pkg.cleanup(); }
});

test('--check detects drift and a stale extra file; write removes it', () => {
  const fx = tree({ ...base, ...extract(GOOD) });
  try {
    assert.ok(run({ root: fx.root }).stale.length >= 4);
    assert.deepEqual(run({ root: fx.root, check: true }).stale, []);
    writeFileSync(join(fx.root, 'src/lib/rules.ts'), RULES.replace("['a', 'b'];", "['a', 'b', ];"));
    assert.deepEqual(run({ root: fx.root, check: true }).stale, ['packages/core/src/extracted/rules.generated.ts']);
    writeFileSync(join(fx.root, 'packages/core/src/extracted/old.generated.ts'), '// stale\n');
    assert.ok(run({ root: fx.root, check: true }).stale.includes('packages/core/src/extracted/old.generated.ts'));
    run({ root: fx.root });
    assert.equal(existsSync(join(fx.root, 'packages/core/src/extracted/old.generated.ts')), false);
    assert.match(readFileSync(join(fx.root, 'packages/core/src/extracted/rules.generated.ts'), 'utf8'), /\['a', 'b', \]/);
  } finally { fx.cleanup(); }
});
