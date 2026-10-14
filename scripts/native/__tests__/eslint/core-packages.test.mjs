// VTID-05183 — ESLint precedence for packages/** and the app-code import ban,
// run through the repo's own eslint.config.js (NATIVE-CI job `lint-rules`).
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

const CORE = 'packages/core/src/__fixture__.ts';
const APP = 'apps/mobile/src/__fixture__.ts';

test('generated files under packages/*/src are globally ignored (window and import.meta report nothing)', async () => {
  const file = join(REPO, 'packages/core/src/extracted/x.generated.ts');
  assert.equal(await eslint.isPathIgnored(file), true);
  assert.equal(await eslint.isPathIgnored(join(REPO, 'packages/tokens/src/tokens.generated.ts')), true);
  const [r] = await eslint.lintText('export const a = window.innerWidth;\nexport const u = import.meta.env.VITE_X;\n', { filePath: file, warnIgnored: false });
  assert.equal(r ? r.messages.length : 0, 0);
  assert.equal(await eslint.isPathIgnored(join(REPO, 'packages/core/src/roles.ts')), false);
});

test('import.meta and window error in packages/core', async () => {
  assert.deepEqual(await lint('export const u = import.meta.env.VITE_X;', CORE), ['no-restricted-syntax:1']);
  assert.deepEqual(await lint('export const a = window.innerWidth;', CORE), ['no-restricted-globals:1']);
});

test('the web Supabase client and gateway base are banned in packages/core and apps/mobile', async () => {
  for (const file of [CORE, APP]) {
    for (const spec of ['@/integrations/supabase/client', '@/lib/gateway-base']) {
      const msgs = await lint(`import x from '${spec}';\nexport default x;`, file);
      assert.ok(msgs.length >= 1 && msgs.every((m) => m === 'no-restricted-imports:1'), `${file} ${spec}: ${msgs}`);
    }
  }
});

test('apps/mobile reaches web code only through @vitana/core', async () => {
  assert.deepEqual(await lint("import { getPermissions } from '@/lib/permissions';\nexport default getPermissions;", APP), ['no-restricted-imports:1']);
  assert.deepEqual(await lint("import x from '../../../src/x';\nexport default x;", APP), ['vitana-native/no-web-src-import:1']);
  assert.deepEqual(await lint("export * from '../../../../src/lib/permissions';", 'apps/mobile/src/config/__fixture__.ts'), ['vitana-native/no-web-src-import:1']);
  // apps/mobile's own src/ and the core aliases stay allowed.
  assert.deepEqual(await lint("import { config } from '../src/config/env';\nexport default config;", 'apps/mobile/tests/__fixture__.ts'), []);
  assert.deepEqual(await lint("import { SCREENS } from '@vitana/core/registry';\nexport default SCREENS;", APP), []);
});

test('a re-export file in packages/core may use @/', async () => {
  assert.deepEqual(await lint("export { SCREENS } from '@/navigation/registry';", 'packages/core/src/registry.ts'), []);
});

test('web src/ files are unaffected by the native blocks', async () => {
  const code = "import { supabase } from '@/integrations/supabase/client';\nexport const a = window.innerWidth + localStorage.length;\nexport const u = import.meta.env.VITE_X;\nexport default supabase;";
  assert.deepEqual(await lint(code, 'src/lib/__fixture__.ts'), []);
});
