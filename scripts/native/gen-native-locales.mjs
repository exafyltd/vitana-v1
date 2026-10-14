#!/usr/bin/env node
/**
 * VTID-05180 — native permission strings from the i18n catalog (Native Wave 1b,
 * plan "N6" Change 13).
 *
 * The iOS microphone usage description is user-visible text, so it comes from
 * src/i18n/<locale>/orbNative.json (`orbNative.micUsageDescription`, keys owned
 * by N6d, DE first, du-form) and never from native code or the config plugin.
 * For every shipped locale this writes an Expo locale file
 *
 *   <out>/<lproj>.json   {"ios": {"NSMicrophoneUsageDescription": "…"}}
 *   <out>/base.json      {"NSMicrophoneUsageDescription": "…"}   (base locale, raw)
 *
 * which Expo turns into <lproj>.lproj/InfoPlist.strings at prebuild. The output
 * folder (apps/mobile/.generated/native-locales) is gitignored, like Wave 0's
 * catalog map. Values in the per-locale files are pre-escaped for the .strings
 * format, because Expo writes them between quotes verbatim.
 *
 * Fails closed: a missing file, a missing or empty key, or a formal German
 * register (Sie/Ihr/Ihnen) exits 1 and writes nothing. There is no fallback text.
 *
 *   node scripts/native/gen-native-locales.mjs [--i18n-dir <dir>] [--out <dir>]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');

export const DEFAULT_I18N_DIR = join(REPO, 'src/i18n');
export const DEFAULT_OUT = join(REPO, 'apps/mobile/.generated/native-locales');
export const LOCALES_FILE = join(REPO, 'apps/mobile/modules/vitana-voice/plugin/native-locales.json');
export const NAMESPACE = 'orbNative';
export const KEY = 'micUsageDescription';

export function loadLocaleMap(file = LOCALES_FILE) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** Formal German pronouns the brand voice never uses (du-form only). */
export function findFormalGerman(text) {
  return text.match(/\b(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres)\b/g) || [];
}

/** Escapes a value for `KEY = "value";` in an InfoPlist.strings file. */
export function escapeStringsValue(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
}

/** Reads `orbNative.micUsageDescription` for every locale. Returns { strings, problems }. */
export function collectMicStrings(i18nDir, locales) {
  const strings = {};
  const problems = [];
  for (const locale of locales) {
    const file = join(i18nDir, locale, `${NAMESPACE}.json`);
    if (!existsSync(file)) {
      problems.push(`${locale}: ${file} is missing`);
      continue;
    }
    let value;
    try {
      value = JSON.parse(readFileSync(file, 'utf8'))?.[NAMESPACE]?.[KEY];
    } catch (err) {
      problems.push(`${locale}: ${file} is not valid JSON (${err.message})`);
      continue;
    }
    if (typeof value !== 'string' || value.trim() === '') {
      problems.push(`${locale}: ${NAMESPACE}.${KEY} is missing or empty in ${file}`);
      continue;
    }
    if (locale === 'de') {
      const formal = findFormalGerman(value);
      if (formal.length) problems.push(`de: ${NAMESPACE}.${KEY} uses the formal register (${formal.join(', ')}); du-form only`);
    }
    strings[locale] = value;
  }
  return { strings, problems };
}

/** { fileName: content } for the output folder. Deterministic. */
export function renderOutputs(strings, map) {
  const files = {};
  for (const locale of Object.keys(map.ios).sort()) {
    const lproj = map.ios[locale];
    const body = { ios: { NSMicrophoneUsageDescription: escapeStringsValue(strings[locale]) } };
    files[`${lproj}.json`] = `${JSON.stringify(body, null, 2)}\n`;
  }
  files['base.json'] = `${JSON.stringify({ NSMicrophoneUsageDescription: strings[map.baseLocale] }, null, 2)}\n`;
  return files;
}

export function generate({ i18nDir = DEFAULT_I18N_DIR, outDir = DEFAULT_OUT, map = loadLocaleMap() } = {}) {
  const locales = Object.keys(map.ios);
  const { strings, problems } = collectMicStrings(i18nDir, locales);
  if (problems.length) return { ok: false, problems };
  const files = renderOutputs(strings, map);
  mkdirSync(outDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) writeFileSync(join(outDir, name), content);
  return { ok: true, files: Object.keys(files) };
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = generate({
    i18nDir: arg('--i18n-dir') ? resolve(arg('--i18n-dir')) : DEFAULT_I18N_DIR,
    outDir: arg('--out') ? resolve(arg('--out')) : DEFAULT_OUT,
  });
  if (!result.ok) {
    process.stderr.write(
      'gen-native-locales: the iOS microphone usage description comes only from the i18n catalog ' +
        `(src/i18n/<locale>/${NAMESPACE}.json, key ${NAMESPACE}.${KEY}; the keys land with N6d, DE first, du-form). ` +
        'There is no fallback text, so the native build stops here:\n' +
        result.problems.map((p) => `  - ${p}`).join('\n') +
        '\n',
    );
    process.exit(1);
  }
  process.stdout.write(`gen-native-locales: wrote ${result.files.length} files\n`);
}
