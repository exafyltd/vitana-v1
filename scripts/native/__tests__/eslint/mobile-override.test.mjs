// VTID-05157 — the apps/mobile ESLint override, run through the repo's own
// eslint.config.js (needs the root node_modules: NATIVE-CI job `lint-rules`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const eslint = new ESLint({ cwd: REPO, overrideConfigFile: join(REPO, 'eslint.config.js') });

async function lint(code, filePath) {
  const [r] = await eslint.lintText(code, { filePath: join(REPO, filePath) });
  return r.messages.map((m) => `${m.ruleId}:${m.line}`);
}

const MOBILE = 'apps/mobile/src/__fixture__.tsx';

test('window, document, localStorage, sessionStorage and matchMedia are banned in apps/mobile', async () => {
  const code = [
    'export const a = window.innerWidth;',
    'export const b = localStorage.getItem("k");',
    'export const c = document.title;',
    'export const d = sessionStorage.length;',
    'export const e = matchMedia("(x)");',
    'export const f = navigator.product;',
  ].join('\n');
  assert.deepEqual(await lint(code, MOBILE), [
    'no-restricted-globals:1',
    'no-restricted-globals:2',
    'no-restricted-globals:3',
    'no-restricted-globals:4',
    'no-restricted-globals:5',
  ]);
});

test('import.meta is banned in apps/mobile', async () => {
  assert.deepEqual(await lint('export const u = import.meta.env.VITE_X;', MOBILE), ['no-restricted-syntax:1']);
});

test('the web Supabase client and gateway base cannot be imported, by alias or relative path', async () => {
  for (const spec of ['@/integrations/supabase/client', '@/lib/gateway-base', '../../../../src/integrations/supabase/client', '../../../src/lib/gateway-base.ts']) {
    const msgs = await lint(`import x from '${spec}';\nexport default x;`, MOBILE);
    assert.ok(msgs.length >= 1 && msgs.every((m) => m === 'no-restricted-imports:1'), `${spec}: ${msgs}`);
  }
  assert.deepEqual(await lint("import { config } from '../config/env';\nexport default config;", MOBILE), []);
});

test('raw JSX text still errors in apps/mobile (i18n rule stays on), accessibilityLabel too', async () => {
  const code = [
    "import { Text, View } from 'react-native';",
    'export default function S() {',
    '  return <View accessibilityLabel="Close menu"><Text>Hello there</Text></View>;',
    '}',
  ].join('\n');
  const msgs = await lint(code, 'apps/mobile/app/fixture.tsx');
  assert.deepEqual(msgs.sort(), ['i18n/no-raw-jsx-text:3', 'i18n/no-raw-jsx-text:3']);
});

test('react-refresh/only-export-components is off in apps/mobile', async () => {
  const code = "export const helper = () => 1;\nexport default function S() { return null; }\nexport const other = { a: helper };";
  assert.ok(!(await lint(code, MOBILE)).some((m) => m.startsWith('react-refresh')));
});

test('web src/ files are not matched by the override', async () => {
  const code = 'export const a = window.innerWidth + localStorage.length;\nexport const u = import.meta.env.VITE_X;';
  assert.deepEqual(await lint(code, 'src/lib/__fixture__.ts'), []);
});

test('generated and build files under apps/mobile are ignored', async () => {
  assert.equal(await eslint.isPathIgnored(join(REPO, 'apps/mobile/src/i18n/catalog-map.generated.ts')), true);
  assert.equal(await eslint.isPathIgnored(join(REPO, 'apps/mobile/dist/x.js')), true);
  assert.equal(await eslint.isPathIgnored(join(REPO, 'apps/mobile/node_modules/x/index.ts')), true);
  assert.equal(await eslint.isPathIgnored(join(REPO, 'apps/mobile/app/index.tsx')), false);
});
