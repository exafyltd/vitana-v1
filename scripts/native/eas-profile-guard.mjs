#!/usr/bin/env node
// VTID-05666 — eas-profile-guard (plan native-eas-builds-r2, Decisions 3 and 6).
// Reads apps/mobile/eas.json (never changes it) and fails when:
//   - the build profiles are not exactly `development` and `test-g1`;
//   - a profile's env.APP_PROFILE is not one of those two;
//   - any key named `production` exists in build or submit (anywhere below them);
//   - any secret-like key exists anywhere in the file (EXPO_TOKEN, *Token, *Secret, *Password, password, p8,
//     keystorePath, serviceAccountKeyPath, credentials, api keys ...), or a value points at a key/cert file;
//   - a `submit` block names a profile other than `test-g1`, or its android track is not `internal`.
// Store identifiers (ascAppId, bundleIdentifier, packageName) are allowed. Run by NATIVE-CI through
// scripts/native/__tests__/eas-profile-guard.test.mjs; also usable as `node scripts/native/eas-profile-guard.mjs [file]`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const EAS_JSON = join(HERE, '..', '..', 'apps', 'mobile', 'eas.json');

export const ALLOWED_PROFILES = ['development', 'test-g1'];
export const SUBMIT_PROFILE = 'test-g1';
export const SUBMIT_TRACK = 'internal';

const SECRET_KEY = /(token|secret|pass(word|wd)|credential|private_?key|api_?key|keystore|service_?account|key_?path|(p8|p12|pem|jks)$)/i;
const SECRET_VALUE = /\.(p8|p12|pem|jks|keystore|pfx|mobileprovision)$|service[-_]?account.*\.json$/i;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function walk(node, path, visit) {
  if (Array.isArray(node)) { node.forEach((v, i) => walk(v, [...path, String(i)], visit)); return; }
  if (isObj(node)) {
    for (const [k, v] of Object.entries(node)) { visit(k, v, [...path, k]); walk(v, [...path, k], visit); }
  }
}

/** @returns {{rule: string, path: string, message: string}[]} */
export function checkEasJson(eas) {
  const out = [];
  const add = (rule, path, message) => out.push({ rule, path: Array.isArray(path) ? path.join('.') : path, message });
  if (!isObj(eas)) { add('shape', '$', 'eas.json must be a JSON object'); return out; }

  // secret-like keys and values, anywhere
  walk(eas, [], (key, value, path) => {
    if (SECRET_KEY.test(key)) add('secret-key', path, `secret-like key "${key}" is not allowed in eas.json (credentials live in EAS and GitHub secrets)`);
    if (typeof value === 'string' && SECRET_VALUE.test(value)) add('secret-value', path, `value "${value}" points at a key or certificate file`);
  });

  // no key named production in build or submit
  for (const section of ['build', 'submit']) {
    if (eas[section] === undefined) continue;
    walk({ [section]: eas[section] }, [], (key, _v, path) => {
      if (key.toLowerCase() === 'production') add('production-key', path, `"${key}" is not allowed: no production profile (plan Decision 6)`);
    });
  }

  // profiles exactly development + test-g1, each with an allowed APP_PROFILE
  const build = eas.build;
  const names = isObj(build) ? Object.keys(build).sort() : [];
  if (JSON.stringify(names) !== JSON.stringify([...ALLOWED_PROFILES].sort())) {
    add('profile-set', 'build', `build profiles must be exactly ${ALLOWED_PROFILES.join(' and ')}, found [${names.join(', ')}]`);
  }
  for (const name of names) {
    const ap = isObj(build[name]) && isObj(build[name].env) ? build[name].env.APP_PROFILE : undefined;
    if (!ALLOWED_PROFILES.includes(ap)) {
      add('app-profile', `build.${name}.env.APP_PROFILE`, `APP_PROFILE must be one of ${ALLOWED_PROFILES.join(', ')}, found ${JSON.stringify(ap)}`);
    }
  }

  // submit: only test-g1, android track internal
  if (eas.submit !== undefined) {
    if (!isObj(eas.submit)) add('shape', 'submit', 'submit must be an object');
    else {
      for (const name of Object.keys(eas.submit)) {
        if (name !== SUBMIT_PROFILE) add('submit-profile', `submit.${name}`, `submit is only allowed for ${SUBMIT_PROFILE}, found "${name}"`);
      }
      const sub = eas.submit[SUBMIT_PROFILE];
      if (isObj(sub) && sub.android !== undefined) {
        const track = isObj(sub.android) ? sub.android.track : undefined;
        if (track !== SUBMIT_TRACK) add('submit-track', `submit.${SUBMIT_PROFILE}.android.track`, `track must be "${SUBMIT_TRACK}", found ${JSON.stringify(track)}`);
      }
    }
  }
  return out;
}

export function checkEasFile(file = EAS_JSON) {
  let parsed;
  try { parsed = JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { return [{ rule: 'json', path: '$', message: `cannot read ${file} as JSON: ${e.message}` }]; }
  return checkEasJson(parsed);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv[2] ? resolve(process.argv[2]) : EAS_JSON;
  const violations = checkEasFile(file);
  if (violations.length) {
    for (const v of violations) console.error(`eas-profile-guard: [${v.rule}] ${v.path}: ${v.message}`);
    process.exit(1);
  }
  console.log(`eas-profile-guard: ${file} ok`);
}
