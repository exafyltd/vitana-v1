// Owner rule 2026-11-07 — a simple front-end change needs a VTID, not a sparring session.
// The class is valid only when the diff proves it. Run: node --test scripts/ci/pr-gate/__tests__/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../lib.mjs';

test('a plain front-end diff qualifies (no sparring)', () => {
  const changed = ['src/components/messages/ConversationView.tsx', 'src/components/messages/ConversationView.test.tsx', 'docs/validation/VTID-1/scope.json'];
  assert.deepEqual(L.frontendSimpleViolations(changed), []);
});

test('back-end, schema, CI and config changes do not qualify', () => {
  for (const f of ['services/gateway/src/routes/vtid.ts', 'supabase/migrations/2026_x.sql', '.github/workflows/PR-GATE.yml', 'scripts/ci/pr-gate/gate.mjs', 'package.json', 'apps/mobile/src/x.tsx']) {
    assert.ok(L.frontendSimpleViolations([f]).length > 0, `${f} must not be frontend-simple`);
  }
});

test('deny-listed front-end files (routes, navigation, auth, integrations) need sparring', () => {
  for (const f of ['src/App.tsx', 'src/navigation/registry/screens.json', 'src/design/screen-manifest.json', 'src/integrations/supabase/client.ts', 'src/routes/guards/RequireAuth.tsx', 'src/contexts/AuthProvider.tsx']) {
    assert.ok(L.frontendSimpleViolations([f]).length > 0, `${f} must not be frontend-simple`);
  }
});

test('bot-only files are exempt; the size limit is enforced', () => {
  assert.deepEqual(L.frontendSimpleViolations(['services/x.ts'], ['services/x.ts']), []);
  const many = Array.from({ length: L.FRONTEND_SIMPLE_MAX_FILES + 1 }, (_, i) => `src/components/c${i}.tsx`);
  assert.equal(L.frontendSimpleViolations(many).length, 1);
  assert.equal(L.frontendSimpleViolations(many.slice(0, L.FRONTEND_SIMPLE_MAX_FILES)).length, 0);
});

test('scope.json accepts change_class frontend-simple and nothing else', () => {
  const base = { vtid: 'VTID-1', kind: 'fix', paths: ['src/**'] };
  assert.deepEqual(L.validateScope({ ...base, change_class: 'frontend-simple' }, 'VTID-1'), []);
  assert.equal(L.validateScope({ ...base, change_class: 'backend' }, 'VTID-1').length, 1);
});

// VTID-05623 — read-only staging specs are part of a simple front-end change.
test('a staging spec next to the change qualifies (VTID-05623)', () => {
  assert.deepEqual(L.frontendSimpleViolations(['src/pages/messages/GroupChat.tsx', 'tests/e2e/staging/vtid-05622-group-chat.staging.spec.ts']), []);
});

test('other tests/ paths and staging fixtures do not qualify (VTID-05623)', () => {
  assert.ok(L.frontendSimpleViolations(['tests/unit/x.test.ts']).length > 0);
  assert.ok(L.frontendSimpleViolations(['tests/e2e/staging/fixtures/draft.json']).length > 0);
  assert.ok(L.frontendSimpleViolations(['tests/e2e/staging/sub/x.staging.spec.ts']).length > 0);
});
