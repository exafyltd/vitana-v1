/**
 * VTID-05180 — iOS part of the VitanaVoice config plugin (plan Change 13).
 *
 * NSMicrophoneUsageDescription comes from the i18n catalog, never from this file:
 * `orbNative.micUsageDescription` in src/i18n/<locale>/orbNative.json (keys owned
 * by N6d, DE first, du-form). At prebuild, scripts/native/gen-native-locales.mjs
 * writes one Expo locale file per language to apps/mobile/.generated/native-locales/
 * (gitignored), Expo turns them into <lang>.lproj/InfoPlist.strings, and the base
 * Info.plist value is the base locale's string.
 *
 * Fail closed: if any locale lacks the key, prebuild stops with a clear message.
 * There is no fallback text. Config evaluation (expo start / export / install
 * --check) does no file IO, adds no `locales` and never throws for missing keys;
 * only the iOS prebuild (and `expo config --type introspect`) does.
 *
 * Development profile only: NSAllowsLocalNetworking, so a dev build can reach the
 * local fake gateway over ws:// (plan Change 7). test-g1 is wss:// only.
 * No UIBackgroundModes audio: the ORB session ends in the background (F9).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { withDangerousMod, withInfoPlist } = require('expo/config-plugins');

const LOCALES = require('./native-locales.json');
const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const GENERATOR = path.join(REPO_ROOT, 'scripts/native/gen-native-locales.mjs');
const OUT_DIR = '.generated/native-locales';
const BASE_FILE = 'base.json';

/** Expo `locales` entries pointing at the generated files (paths relative to the project root). */
function localeEntries() {
  const entries = {};
  for (const lproj of Object.values(LOCALES.ios)) entries[lproj] = `./${OUT_DIR}/${lproj}.json`;
  return entries;
}

/** Runs the generator; throws its own message when keys are missing. */
function generateNativeLocales(projectRoot, i18nDir) {
  const args = [GENERATOR, '--out', path.join(projectRoot, OUT_DIR)];
  if (i18nDir) args.push('--i18n-dir', i18nDir);
  try {
    execFileSync(process.execPath, args, { stdio: 'pipe' });
  } catch (err) {
    const detail = String((err.stderr && err.stderr.toString()) || err.message).trim();
    throw new Error(`withVitanaVoice (iOS): ${detail}`);
  }
}

function readBaseStrings(projectRoot) {
  const file = path.join(projectRoot, OUT_DIR, BASE_FILE);
  const base = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (typeof base.NSMicrophoneUsageDescription !== 'string' || !base.NSMicrophoneUsageDescription) {
    throw new Error(`withVitanaVoice (iOS): ${file} has no NSMicrophoneUsageDescription`);
  }
  return base;
}

/** Pure Info.plist edit (unit-tested). */
function applyInfoPlist(infoPlist, { profile, micUsageDescription }) {
  const next = { ...infoPlist, NSMicrophoneUsageDescription: micUsageDescription };
  if (profile === 'development') {
    next.NSAppTransportSecurity = { ...(infoPlist.NSAppTransportSecurity || {}), NSAllowsLocalNetworking: true };
  }
  return next;
}

function withVitanaVoiceIos(config, props = {}) {
  const { profile, i18nDir } = props;
  // Dangerous mods run first on iOS. The generated files exist from here on, and
  // the `locales` entries pointing at them are added to the config the later
  // mods receive (Expo's locales xcodeproj mod reads them). They are not set at
  // evaluation time: `expo export` resolves `locales` and would fail on files
  // that only a prebuild generates.
  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      generateNativeLocales(cfg.modRequest.projectRoot, i18nDir);
      return { ...cfg, locales: { ...(cfg.locales || {}), ...localeEntries() } };
    },
  ]);
  config = withInfoPlist(config, (cfg) => {
    // Introspection (`expo config --type introspect`) skips dangerous mods, so
    // generate here too; the generator is deterministic and idempotent.
    if (cfg.modRequest.introspect) generateNativeLocales(cfg.modRequest.projectRoot, i18nDir);
    const base = readBaseStrings(cfg.modRequest.projectRoot);
    cfg.modResults = applyInfoPlist(cfg.modResults, {
      profile,
      micUsageDescription: base.NSMicrophoneUsageDescription,
    });
    return cfg;
  });
  return config;
}

module.exports = withVitanaVoiceIos;
module.exports.applyInfoPlist = applyInfoPlist;
module.exports.localeEntries = localeEntries;
module.exports.generateNativeLocales = generateNativeLocales;
module.exports.OUT_DIR = OUT_DIR;
