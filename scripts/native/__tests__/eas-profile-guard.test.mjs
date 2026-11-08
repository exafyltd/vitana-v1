// VTID-05666 — eas-profile-guard: apps/mobile/eas.json keeps only the `development` and `test-g1` build profiles,
// holds no secret, and (if it has a submit block) submits only `test-g1` to the internal track.
// Fixture objects and scratch copies only; the repo file is read, never changed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkEasJson, checkEasFile, EAS_JSON } from '../eas-profile-guard.mjs';

const GOOD = () => ({
  cli: { version: '>= 10.0.0', appVersionSource: 'local' },
  build: {
    development: { developmentClient: true, distribution: 'internal', env: { APP_PROFILE: 'development' } },
    'test-g1': { distribution: 'internal', env: { APP_PROFILE: 'test-g1' } },
  },
});
const withSubmit = (submit) => ({ ...GOOD(), submit });
const mutate = (fn) => { const o = GOOD(); fn(o); return o; };
const rules = (o) => checkEasJson(o).map((v) => v.rule);

test('the current apps/mobile/eas.json passes', () => {
  assert.deepEqual(checkEasFile(EAS_JSON), []);
});

test('a valid fixture passes', () => {
  assert.deepEqual(checkEasJson(GOOD()), []);
});

test('a production build profile fails', () => {
  const o = mutate((x) => { x.build.production = { env: { APP_PROFILE: 'production' } }; });
  const r = rules(o);
  assert.ok(r.includes('production-key'));
  assert.ok(r.includes('profile-set'));
  assert.ok(r.includes('app-profile'));
});

test('a build profile with no key named production but an unknown name fails', () => {
  const o = mutate((x) => { x.build.staging = { env: { APP_PROFILE: 'development' } }; });
  assert.ok(rules(o).includes('profile-set'));
});

test('a missing development or test-g1 profile fails', () => {
  assert.ok(rules(mutate((x) => { delete x.build['test-g1']; })).includes('profile-set'));
  assert.ok(rules(mutate((x) => { delete x.build; })).includes('profile-set'));
});

test('an APP_PROFILE outside development / test-g1 fails', () => {
  assert.ok(rules(mutate((x) => { x.build.development.env.APP_PROFILE = 'production'; })).includes('app-profile'));
  assert.ok(rules(mutate((x) => { x.build['test-g1'].env.APP_PROFILE = 'staging'; })).includes('app-profile'));
  assert.ok(rules(mutate((x) => { delete x.build['test-g1'].env; })).includes('app-profile'));
});

test('a submit.production block fails', () => {
  const o = withSubmit({ production: { android: { track: 'internal' } } });
  const r = rules(o);
  assert.ok(r.includes('production-key'));
  assert.ok(r.includes('submit-profile'));
});

test('a submit block for a profile other than test-g1 fails', () => {
  assert.ok(rules(withSubmit({ development: {} })).includes('submit-profile'));
});

test('a submit track other than internal fails, internal passes', () => {
  for (const track of ['production', 'beta', 'alpha', 'rollout', '', undefined]) {
    assert.ok(rules(withSubmit({ 'test-g1': { android: track === undefined ? {} : { track } } })).includes('submit-track'), String(track));
  }
  assert.deepEqual(checkEasJson(withSubmit({ 'test-g1': { android: { track: 'internal' } } })), []);
});

test('store identifiers are allowed', () => {
  const o = withSubmit({ 'test-g1': { ios: { ascAppId: '1234567890' }, android: { track: 'internal' } } });
  o.build['test-g1'].ios = { bundleIdentifier: 'com.example.app' };
  o.build['test-g1'].android = { packageName: 'com.example.app' };
  assert.deepEqual(checkEasJson(o), []);
});

const SECRET_KEYS = [
  'EXPO_TOKEN', 'expoToken', 'accessToken', 'authToken', 'clientSecret', 'appSecret', 'userPassword', 'password',
  'p8', 'ascApiKeyP8', 'keystorePath', 'serviceAccountKeyPath', 'keystorePassword', 'credentialsSource',
  'credentials', 'privateKey', 'ascApiKeyPath', 'apiKey',
];
for (const key of SECRET_KEYS) {
  test(`secret-like key ${key} fails (in env, in a profile, in submit)`, () => {
    assert.ok(rules(mutate((x) => { x.build.development.env[key] = 'x'; })).includes('secret-key'));
    assert.ok(rules(mutate((x) => { x.build['test-g1'][key] = 'x'; })).includes('secret-key'));
    assert.ok(rules(withSubmit({ 'test-g1': { android: { track: 'internal', [key]: 'x' } } })).includes('secret-key'));
  });
}

test('a secret-like top-level or nested key anywhere fails, whatever the value', () => {
  assert.ok(rules(mutate((x) => { x.cli.EXPO_TOKEN = ''; })).includes('secret-key'));
  assert.ok(rules(mutate((x) => { x.build.development.env.deep = { nested: { clientSecret: 1 } }; })).includes('secret-key'));
});

test('a secret key path in a value fails', () => {
  for (const v of ['./keys/AuthKey_ABC.p8', 'certs/dist.p12', 'play-service-account.json', 'upload.keystore', 'a/b.jks', 'k.pem']) {
    assert.ok(rules(mutate((x) => { x.build.development.env.SOMETHING = v; })).includes('secret-value'), v);
  }
  assert.deepEqual(checkEasJson(mutate((x) => { x.build.development.env.SOMETHING = 'plain'; })), []);
});

test('a non-object or invalid json fails', () => {
  assert.ok(rules([]).includes('shape'));
  assert.ok(rules(null).includes('shape'));
  const dir = mkdtempSync(join(tmpdir(), 'eas-guard-'));
  try {
    const f = join(dir, 'eas.json');
    writeFileSync(f, '{ nope');
    assert.ok(checkEasFile(f).some((v) => v.rule === 'json'));
    assert.ok(checkEasFile(join(dir, 'missing.json')).some((v) => v.rule === 'json'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the CLI exits 0 on the repo file and 1 on a scratch copy with a production profile', () => {
  const cli = new URL('../eas-profile-guard.mjs', import.meta.url).pathname;
  const ok = spawnSync(process.execPath, [cli], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const dir = mkdtempSync(join(tmpdir(), 'eas-guard-'));
  try {
    const bad = JSON.parse(readFileSync(EAS_JSON, 'utf8'));
    bad.build.production = { env: { APP_PROFILE: 'production' } };
    const f = join(dir, 'eas.json');
    writeFileSync(f, JSON.stringify(bad));
    const r = spawnSync(process.execPath, [cli, f], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /production/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
