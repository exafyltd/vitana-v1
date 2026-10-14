// VTID-05157 — extraction dependency analysis on a fixture src/ tree.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, scanSource, prodHostsIn, recommend, toMarkdown, CANDIDATES } from '../extraction-deps.mjs';
import { tree } from './fixture.mjs';

const at = (signals, type) => signals.filter((s) => s.type === type).map((s) => `${s.detail}@${s.line}`);

test('signals carry exact line numbers; a type position is not a signal', () => {
  const src = [
    "import type { Foo } from 'react-router-dom';", // 1 type-only import: no web-pkg signal
    'type W = typeof window;', //                       2 type position
    'export function f(w: typeof window, d?: Document) {', // 3 type positions
    '  return window.innerWidth;', //                    4 dom
    '}', //                                              5
    'export const k = localStorage.getItem("k");', //    6 storage
    'export const s = window.sessionStorage;', //        7 storage via window
    'const env = import.meta.env.VITE_X;', //            8 vite
    'export const o = { window: 1, document };', //      9 property name is not a signal; shorthand is
    'export const el = <div className="x" />;', //       10 dom-jsx
    'export const ok = <View />;', //                    11 component, not dom-jsx
  ].join('\n');
  const { signals, imports } = scanSource(src, 'src/x.tsx');
  assert.deepEqual(imports, []);
  assert.deepEqual(at(signals, 'dom'), ['window@4', 'document@9']);
  assert.deepEqual(at(signals, 'storage'), ['localStorage@6', 'window.sessionStorage@7']);
  assert.deepEqual(at(signals, 'vite'), ['import.meta.env@8']);
  assert.deepEqual(at(signals, 'dom-jsx'), ['<div>@10']);
});

test('a locally declared name shadows the DOM global', () => {
  const { signals } = scanSource('export function f(location: string) { return location.length; }', 'src/y.ts');
  assert.deepEqual(signals, []);
});

test('the prod-fallback detector catches the shapes of the web Supabase and gateway clients', () => {
  // Shapes of src/integrations/supabase/client.ts:10-16 and src/lib/gateway-base.ts:11.
  const src = [
    'const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://inmkhvwdcuyhnxkgfvsb.supabase.co";',
    "const DEFAULT_GATEWAY = 'https://gateway.vitanaland.com';",
    'const stage = `https://preview-aws-gateway.vitanaland.com/api/${"v1"}`;',
    "const mail = 'support@vitanaland.com';",
    "const other = 'https://example.org';",
  ].join('\n');
  const { signals } = scanSource(src, 'src/z.ts');
  assert.deepEqual(at(signals, 'prod-fallback'), ['inmkhvwdcuyhnxkgfvsb.supabase.co@1', 'gateway.vitanaland.com@2', 'preview-aws-gateway.vitanaland.com@3']);
  assert.deepEqual(prodHostsIn('see https://vitanaland.com/privacy'), ['vitanaland.com']);
  assert.deepEqual(prodHostsIn('https://g1-test.example.org'), []);
});

function fixture() {
  return tree({
    'src/lib/pure.ts': "import { helper } from '@/lib/util';\nexport const x = helper(1);\n",
    'src/lib/util/index.ts': "export const helper = (n: number) => n + 1;\n",
    'src/lib/env.ts': 'export const url = import.meta.env.VITE_URL;\n',
    'src/lib/uses-env.ts': "import { url } from './env';\nexport const u = url;\n",
    'src/lib/toast.ts': "import { toast } from 'sonner';\nexport const t = toast;\n",
    'src/lib/format.ts': "import { t } from './toast';\nimport data from '../data/x.json';\nexport const f = () => t;\nexport const d = data;\n",
    'src/lib/chain.ts': "import { f } from '@/lib/format';\nexport const c = f;\n",
    'src/lib/types-only.ts': "import type { t } from './toast';\nexport type T = typeof t;\n",
    'src/lib/icons.ts': "import { Home } from 'lucide-react';\nexport const items = [{ icon: Home, path: '/home' }];\n",
    'src/lib/styled.ts': "import './styled.css';\nexport const s = 1;\n",
    'src/lib/styled.css': '.a{}\n',
    'src/data/x.json': '{"a":1}\n',
    'src/lib/cyc-a.ts': "import { b } from './cyc-b';\nexport const a = () => b;\n",
    'src/lib/cyc-b.ts': "import { a } from './cyc-a';\nexport const b = () => a;\n",
    'src/lib/pure.test.ts': 'window.alert(1);\n',
  });
}

test('@/ and index resolution, classes and the transitive blocking chain', () => {
  const fx = fixture();
  try {
    const { modules, cycles } = analyze(fx.root);
    assert.ok(!modules['src/lib/pure.test.ts'], 'tests are not analysed');
    assert.deepEqual(modules['src/lib/pure.ts'].imports, ['src/lib/util/index.ts']);
    assert.equal(modules['src/lib/pure.ts'].class, 'A');
    assert.equal(modules['src/lib/env.ts'].own, 'B');
    assert.equal(modules['src/lib/uses-env.ts'].own, 'A');
    assert.equal(modules['src/lib/uses-env.ts'].class, 'B');
    assert.equal(modules['src/lib/toast.ts'].own, 'C');
    assert.equal(modules['src/lib/format.ts'].own, 'A');
    assert.equal(modules['src/lib/format.ts'].class, 'C');
    assert.deepEqual(modules['src/lib/chain.ts'].blocking_chain, ['src/lib/chain.ts', 'src/lib/format.ts', 'src/lib/toast.ts']);
    assert.equal(modules['src/lib/chain.ts'].closure_size, 3);
    assert.equal(modules['src/lib/types-only.ts'].class, 'A', 'type-only imports carry no runtime coupling');
    assert.equal(modules['src/lib/styled.ts'].own, 'C', 'a stylesheet import is web-only');
    assert.equal(modules['src/data/x.json'].class, 'A');
    assert.deepEqual(cycles, [['src/lib/cyc-a.ts', 'src/lib/cyc-b.ts']]);
    assert.equal(recommend(modules, 'src/lib/icons.ts'), 'split data from icons');
    assert.equal(recommend(modules, 'src/lib/env.ts'), 'inject config+storage');
    assert.equal(recommend(modules, 'src/lib/pure.ts'), 're-export as is');
    assert.match(recommend(modules, 'src/lib/format.ts'), /blocked transitively via src\/lib\/format.ts → src\/lib\/toast.ts/);
    assert.equal(recommend(modules, 'src/nope.ts'), 'not found at this commit');
  } finally { fx.cleanup(); }
});

test('the markdown report names the commit and judges every program §3 candidate', () => {
  const fx = fixture();
  try {
    const md = toMarkdown(analyze(fx.root), { commit: 'abc123', date: '2026-10-13' });
    assert.match(md, /at commit `abc123` \(2026-10-13\)/);
    for (const c of CANDIDATES) assert.ok(md.includes(`\`${c.path}\``), c.path);
    assert.match(md, /1 import cycle\(s\) in `src\/` in total/);
  } finally { fx.cleanup(); }
});

test('VTID-05183: zustand persist() without `storage` is implicit-storage (class B); with storage it is not', () => {
  const without = [
    "import { create } from 'zustand';",
    "import { persist } from 'zustand/middleware';",
    "export const useS = create(persist((set) => ({ a: 1 }), { name: 'x' }));",
  ].join('\n');
  const { signals } = scanSource(without, 'src/stores/a.ts');
  assert.deepEqual(at(signals, 'implicit-storage'), ['zustand persist() without storage → localStorage@3']);
  const fx = tree({ 'src/stores/a.ts': without });
  try {
    assert.equal(analyze(fx.root).modules['src/stores/a.ts'].own, 'B');
  } finally { fx.cleanup(); }
  const withStorage = [
    "import { create } from 'zustand';",
    "import { persist as keep, createJSONStorage } from 'zustand/middleware';",
    'export const useS = create(keep((set) => ({ a: 1 }), { name: \'x\', storage: createJSONStorage(() => mem) }));',
  ].join('\n');
  assert.deepEqual(at(scanSource(withStorage, 'src/stores/b.ts').signals, 'implicit-storage'), []);
  const noOptions = "import { persist } from 'zustand/middleware';\nexport const s = persist((set) => ({}));";
  assert.equal(at(scanSource(noOptions, 'src/stores/c.ts').signals, 'implicit-storage').length, 1);
  // a local function called persist is not zustand's
  assert.deepEqual(scanSource('const persist = (x: unknown) => x;\nexport const s = persist(1);', 'src/stores/d.ts').signals, []);
});
