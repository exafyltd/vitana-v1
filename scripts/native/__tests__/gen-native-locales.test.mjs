// VTID-05180 — native permission strings come only from the i18n catalog, for all 11 locales, du-form, deterministic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectMicStrings,
  escapeStringsValue,
  findFormalGerman,
  generate,
  loadLocaleMap,
} from '../gen-native-locales.mjs';
import { tree } from './fixture.mjs';

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '../gen-native-locales.mjs');
const SHIPPED = ['ar', 'de', 'en', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh'];

function catalog(overrides = {}) {
  const files = {};
  for (const l of SHIPPED) {
    files[`src/i18n/${l}/orbNative.json`] = { orbNative: { micUsageDescription: `mic ${l}` } };
  }
  files['src/i18n/de/orbNative.json'] = {
    orbNative: { micUsageDescription: 'Vitana braucht dein Mikrofon, damit du mit ihr sprechen kannst.' },
  };
  return tree({ ...files, ...overrides });
}

test('the locale map covers exactly the 11 shipped locales, with Latin Serbian and Simplified Chinese', () => {
  const map = loadLocaleMap();
  assert.deepEqual(Object.keys(map.ios).sort(), SHIPPED);
  assert.equal(map.ios.sr, 'sr-Latn');
  assert.equal(map.ios.zh, 'zh-Hans');
  assert.equal(map.baseLocale, 'en');
});

test('writes one Expo locale file per locale plus the base string, deterministically', () => {
  const fx = catalog();
  try {
    const out = join(fx.root, 'out');
    const r = generate({ i18nDir: join(fx.root, 'src/i18n'), outDir: out });
    assert.equal(r.ok, true);
    const names = readdirSync(out).sort();
    assert.equal(names.length, 12);
    assert.ok(names.includes('sr-Latn.json') && names.includes('zh-Hans.json') && names.includes('base.json'));
    assert.deepEqual(JSON.parse(readFileSync(join(out, 'ar.json'), 'utf8')), {
      ios: { NSMicrophoneUsageDescription: 'mic ar' },
    });
    assert.deepEqual(JSON.parse(readFileSync(join(out, 'base.json'), 'utf8')), { NSMicrophoneUsageDescription: 'mic en' });
    const first = names.map((n) => readFileSync(join(out, n), 'utf8'));
    generate({ i18nDir: join(fx.root, 'src/i18n'), outDir: out });
    assert.deepEqual(names.map((n) => readFileSync(join(out, n), 'utf8')), first);
  } finally {
    fx.cleanup();
  }
});

test('fails closed, writing nothing, when a locale or the key is missing', () => {
  const fx = catalog({ 'src/i18n/pl/orbNative.json': { orbNative: {} } });
  try {
    const out = join(fx.root, 'out');
    const r = generate({ i18nDir: join(fx.root, 'src/i18n'), outDir: out });
    assert.equal(r.ok, false);
    assert.match(r.problems.join('\n'), /pl: orbNative\.micUsageDescription is missing or empty/);
    assert.equal(existsSync(out), false);
  } finally {
    fx.cleanup();
  }
});

test('reports every locale without an orbNative.json (today: all of them, until N6d adds the keys)', () => {
  const fx = tree({ 'src/i18n/de/audio.json': { audio: {} } });
  try {
    const { problems } = collectMicStrings(join(fx.root, 'src/i18n'), SHIPPED);
    assert.equal(problems.length, 11);
    assert.match(problems[0], /orbNative\.json is missing/);
  } finally {
    fx.cleanup();
  }
});

test('the CLI exits 1 with an explanation and no fallback text', () => {
  const fx = tree({ 'src/i18n/de/audio.json': { audio: {} } });
  try {
    assert.throws(
      () => execFileSync(process.execPath, [SCRIPT, '--i18n-dir', join(fx.root, 'src/i18n'), '--out', join(fx.root, 'out')], { stdio: 'pipe' }),
      (err) => err.status === 1 && /no fallback text/.test(String(err.stderr)) && /N6d/.test(String(err.stderr)),
    );
    assert.equal(existsSync(join(fx.root, 'out')), false);
  } finally {
    fx.cleanup();
  }
});

test('German must be du-form', () => {
  assert.deepEqual(findFormalGerman('Erlaube Vitana, dein Mikrofon zu nutzen.'), []);
  assert.deepEqual(findFormalGerman('Bitte erlauben Sie Ihr Mikrofon.'), ['Sie', 'Ihr']);
  const fx = catalog({ 'src/i18n/de/orbNative.json': { orbNative: { micUsageDescription: 'Damit Sie sprechen können.' } } });
  try {
    const r = generate({ i18nDir: join(fx.root, 'src/i18n'), outDir: join(fx.root, 'out') });
    assert.equal(r.ok, false);
    assert.match(r.problems.join('\n'), /de: .*formal register \(Sie\)/);
  } finally {
    fx.cleanup();
  }
});

test('values are escaped for InfoPlist.strings, the base value stays raw', () => {
  assert.equal(escapeStringsValue('Say "hi"\\now\nok'), 'Say \\"hi\\"\\\\now\\nok');
  const fx = catalog({ 'src/i18n/en/orbNative.json': { orbNative: { micUsageDescription: 'Talk to "Vitana"' } } });
  try {
    const out = join(fx.root, 'out');
    generate({ i18nDir: join(fx.root, 'src/i18n'), outDir: out });
    assert.equal(JSON.parse(readFileSync(join(out, 'en.json'), 'utf8')).ios.NSMicrophoneUsageDescription, 'Talk to \\"Vitana\\"');
    assert.equal(JSON.parse(readFileSync(join(out, 'base.json'), 'utf8')).NSMicrophoneUsageDescription, 'Talk to "Vitana"');
  } finally {
    fx.cleanup();
  }
});
