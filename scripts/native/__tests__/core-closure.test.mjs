// VTID-05183 — the @vitana/core closure gate on fixture trees.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { compute, staleOutputs, CLOSURE_OUT, CI_PATHS_OUT } from '../core-closure.mjs';
import { tree } from './fixture.mjs';

const base = () => ({
  'apps/mobile/package.json': { name: '@vitana/mobile', dependencies: { '@supabase/supabase-js': '2.56.0' } },
  'src/lib/pure.ts': "import data from './data.json';\nexport const x = data.a;\n",
  'src/lib/data.json': '{"a":1}\n',
  'src/lib/env.ts': 'export const url = import.meta.env.VITE_URL;\n',
  'src/lib/uses-env.ts': "import { url } from './env';\nexport const u = url;\n",
  'src/lib/types.ts': 'export type T = { a: number };\n',
  'src/lib/rules.ts': 'export const r = 1;\n',
  'src/lib/extra.ts': 'export const e = 2;\n',
  'src/assets/flags/de.png': 'png',
  'packages/core/src/pure.ts': "export { x } from '@/lib/pure';\nexport type { T } from '@/lib/types';\n",
  'packages/core/src/client.ts': "import { createClient } from '@supabase/supabase-js';\nexport const make = createClient;\n",
  'packages/core/src/extracted/assets.generated.ts': "export const ASSETS = { 'src/assets/flags/de.png': require('../../../../src/assets/flags/de.png') };\n",
  'packages/core/manifest.json': { reexports: {
    'src/lib/pure.ts': { entry: 'pure.ts', reason: 'pure', lanes: ['N3'] },
    'src/lib/types.ts': { entry: 'pure.ts', reason: 'types', lanes: ['N3'] },
  } },
  'packages/core/extract.json': { entries: { rules: { sources: [{ file: 'src/lib/rules.ts', take: ['r'] }] } } },
  'packages/tokens/tokens.config.json': { css: 'src/index.css', tailwind: 'tailwind.config.ts' },
});

test('a clean tree: closure, assets and the generated CI path list', () => {
  const fx = tree(base());
  try {
    const r = compute(fx.root);
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.closure, ['src/lib/data.json', 'src/lib/pure.ts', 'src/lib/types.ts']);
    assert.deepEqual(r.assets, ['src/assets/flags/de.png']);
    const ci = JSON.parse(r.outputs[CI_PATHS_OUT]).paths;
    // every closure src/ file, every extract.json source and asset, and the token sources
    assert.deepEqual(ci, ['src/assets/flags/de.png', 'src/index.css', 'src/lib/data.json', 'src/lib/pure.ts', 'src/lib/rules.ts', 'src/lib/types.ts', 'tailwind.config.ts']);
  } finally { fx.cleanup(); }
});

test('a manifest re-export of a B module fails with its chain', () => {
  const t = base();
  t['packages/core/src/env.ts'] = "export { u } from '@/lib/uses-env';\n";
  t['packages/core/manifest.json'].reexports['src/lib/uses-env.ts'] = { entry: 'env.ts', reason: 'x', lanes: ['N3'] };
  const fx = tree(t);
  try {
    const errors = compute(fx.root).errors.join('\n');
    assert.match(errors, /src\/lib\/env\.ts is class B \(vite `import\.meta\.env` L1\) and core reaches it: src\/lib\/uses-env\.ts → src\/lib\/env\.ts/);
  } finally { fx.cleanup(); }
});

test('a prod-fallback literal anywhere in packages/** fails', () => {
  const t = base();
  t['packages/core/src/bad.ts'] = "export const DEFAULT = 'https://gateway.vitanaland.com';\n";
  t['packages/tokens/README.md'] = 'see https://inmkhvwdcuyhnxkgfvsb.supabase.co\n';
  const fx = tree(t);
  try {
    const errors = compute(fx.root).errors.join('\n');
    assert.match(errors, /packages\/core\/src\/bad\.ts: contains a production\/staging host \(gateway\.vitanaland\.com\)/);
    assert.match(errors, /packages\/tokens\/README\.md: contains a production\/staging host/);
  } finally { fx.cleanup(); }
});

test('an unlisted re-export fails, and so does a manifest line nothing re-exports', () => {
  const t = base();
  t['packages/core/src/more.ts'] = "export { r } from '@/lib/rules';\n";
  t['packages/core/manifest.json'].reexports['src/lib/data.json'] = { entry: 'x.ts', reason: 'x', lanes: ['N3'] };
  const fx = tree(t);
  try {
    const errors = compute(fx.root).errors.join('\n');
    assert.match(errors, /packages\/core\/src\/more\.ts: re-exports src\/lib\/rules\.ts \(@\/lib\/rules\), which is not listed in packages\/core\/manifest\.json/);
    assert.match(errors, /lists src\/lib\/data\.json, but no entry file re-exports it/);
  } finally { fx.cleanup(); }
});

test('@/ outside an entry file, a relative reach into src/, an undeclared or web-only package fail', () => {
  const t = base();
  t['packages/core/src/sub/deep.ts'] = "export { x } from '@/lib/pure';\n";
  t['packages/core/src/rel.ts'] = "export { x } from '../../../src/lib/pure';\n";
  t['packages/core/src/pkg.ts'] = "import z from 'zustand';\nimport { Mail } from 'lucide-react';\nexport const a = [z, Mail];\n";
  const fx = tree(t);
  try {
    const errors = compute(fx.root).errors.join('\n');
    assert.match(errors, /sub\/deep\.ts: imports @\/lib\/pure; only the entry files/);
    assert.match(errors, /rel\.ts: relative import \.\.\/\.\.\/\.\.\/src\/lib\/pure leaves packages\//);
    assert.match(errors, /pkg\.ts: imports zustand, which apps\/mobile\/package\.json does not depend on/);
    assert.match(errors, /pkg\.ts: imports the web-only package lucide-react/);
  } finally { fx.cleanup(); }
});

test('a stale closure.generated.json or mobile-ci-paths.generated.json is detected', () => {
  const fx = tree(base());
  try {
    let r = compute(fx.root);
    mkdirSync(join(fx.root, 'scripts/native'), { recursive: true });
    for (const [rel, text] of Object.entries(r.outputs)) writeFileSync(join(fx.root, rel), text);
    assert.deepEqual(staleOutputs(fx.root, r.outputs), []);
    // A closure module gains an import: both outputs go stale.
    writeFileSync(join(fx.root, 'src/lib/pure.ts'), "import data from './data.json';\nimport { e } from './extra';\nexport const x = data.a + e;\n");
    r = compute(fx.root);
    assert.deepEqual(staleOutputs(fx.root, r.outputs).sort(), [CLOSURE_OUT, CI_PATHS_OUT].sort());
    // A new extract.json source changes only the CI path list.
    for (const [rel, text] of Object.entries(r.outputs)) writeFileSync(join(fx.root, rel), text);
    writeFileSync(join(fx.root, 'packages/core/extract.json'), JSON.stringify({ entries: { rules: { sources: [{ file: 'src/lib/rules.ts', take: ['r'] }, { file: 'src/lib/uses-env.ts', take: ['u'] }] } } }));
    assert.deepEqual(staleOutputs(fx.root, compute(fx.root).outputs), [CI_PATHS_OUT]);
  } finally { fx.cleanup(); }
});
