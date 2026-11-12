// VTID-05767 (autonomous-to-staging/pipeline-b-v1) — Pipeline B everywhere (plan §3.2, H10):
// the frontend-simple class also covers the native app's screen code `apps/mobile/src/**`.
// Native navigation, deep-link routing, the shell, auth, config, the @vitana/core ports,
// the parity ledger, app.json / eas.json / app.config.ts and generated files still need sparring.
// NATIVE-CI (parity ledger, shell pins) keeps running on every apps/mobile change.
// Run: node --test scripts/ci/pr-gate/__tests__/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as L from '../lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

test('a native screen change in apps/mobile/src qualifies (VTID-05767)', () => {
  const changed = [
    'apps/mobile/src/screens/x.tsx',
    'apps/mobile/src/screens/diary/DiaryScreen.tsx',
    'apps/mobile/src/ui/foundation/Card.tsx',
    'apps/mobile/src/theme/colors.ts',
    'apps/mobile/src/orb/ui/OrbButton.tsx',
    'docs/validation/VTID-1/scope.json',
  ];
  assert.deepEqual(L.frontendSimpleViolations(changed), []);
});

test('a web change and its native twin qualify together (VTID-05767)', () => {
  assert.deepEqual(L.frontendSimpleViolations(['src/components/diary/DiaryCard.tsx', 'apps/mobile/src/screens/diary/DiaryCard.tsx']), []);
});

test('native navigation, linking, shell, auth, config and ports need sparring (VTID-05767)', () => {
  for (const f of [
    'apps/mobile/src/navigation/navigate.ts',
    'apps/mobile/src/navigation/guest-paths.ts',
    'apps/mobile/src/linking/link-router.ts',
    'apps/mobile/src/shell/ShellRoot.tsx',
    'apps/mobile/src/shell/components/TabBar.tsx',
    'apps/mobile/src/auth/AuthProvider.tsx',
    'apps/mobile/src/config/env.ts',
    'apps/mobile/src/ports/tokens.ts',
  ]) {
    assert.ok(L.frontendSimpleViolations([f]).length > 0, `${f} must not be frontend-simple`);
  }
});

test('parity ledger, app.json, eas.json, app config and generated files need sparring (VTID-05767)', () => {
  for (const f of [
    'apps/mobile/parity/ledger.json',
    'apps/mobile/app.json',
    'apps/mobile/eas.json',
    'apps/mobile/app.config.ts',
    'apps/mobile/src/i18n/catalog-map.generated.ts',
    'apps/mobile/src/screens/x/data.generated.json',
    'apps/mobile/src/.generated/strings.json',
  ]) {
    assert.ok(L.frontendSimpleViolations([f]).length > 0, `${f} must not be frontend-simple`);
  }
});

test('everything else under apps/mobile stays outside the class (VTID-05767)', () => {
  for (const f of [
    'apps/mobile/app/_layout.tsx',
    'apps/mobile/app/(tabs)/index.tsx',
    'apps/mobile/package.json',
    'apps/mobile/package-lock.json',
    'apps/mobile/metro.config.js',
    'apps/mobile/modules/x/index.ts',
    'apps/mobile/tests/ports.test.ts',
    'apps/mobile/maestro/flow.yaml',
    'packages/core/src/x.ts',
  ]) {
    assert.ok(L.frontendSimpleViolations([f]).length > 0, `${f} must not be frontend-simple`);
  }
});

test('the deny list names the native surfaces explicitly (VTID-05767)', () => {
  for (const g of ['apps/mobile/src/navigation/**', 'apps/mobile/parity/**', 'apps/mobile/app.json', 'apps/mobile/eas.json']) {
    assert.ok(L.FRONTEND_SIMPLE_DENY.includes(g), `${g} must be in FRONTEND_SIMPLE_DENY`);
  }
  assert.ok(L.FRONTEND_SIMPLE_ALLOW.includes('apps/mobile/src/**'));
});

test('existing web surfaces are unchanged (VTID-05767)', () => {
  assert.deepEqual(L.frontendSimpleViolations(['src/pages/Home.tsx', 'public/robots.txt', 'tests/e2e/staging/vtid-1-x.staging.spec.ts']), []);
  for (const f of ['src/App.tsx', 'src/navigation/registry/screens.json', 'src/design/tokens.ts', 'src/integrations/supabase/client.ts', 'src/routes/guards/RequireAuth.tsx', 'src/contexts/AuthProvider.tsx', 'src/generated/x.ts']) {
    assert.ok(L.frontendSimpleViolations([f]).length > 0, `${f} must not be frontend-simple`);
  }
});

test('NATIVE-CI and its parity checks still run on every apps/mobile change (VTID-05767)', () => {
  const wf = readFileSync(join(ROOT, '.github/workflows/NATIVE-CI.yml'), 'utf8');
  const pr = wf.slice(wf.indexOf('pull_request:'), wf.indexOf('push:'));
  assert.match(pr, /- 'apps\/mobile\/\*\*'/, 'NATIVE-CI must trigger on apps/mobile/** pull requests');
  assert.match(wf, /node scripts\/native\/parity-ledger\.mjs --check/, 'NATIVE-CI must run the parity ledger check');
  assert.match(wf, /node scripts\/native\/check-shell-pins\.mjs/, 'NATIVE-CI must run the shell source pins check');
});
