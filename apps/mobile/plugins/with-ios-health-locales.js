/**
 * VTID-05184 — HealthKit purpose string per locale (N5a plan change 4).
 *
 * Runs after the HealthKit library plugin (which is configured with
 * `NSHealthShareUsageDescription: true` — "keep an existing string" — and
 * `NSHealthUpdateUsageDescription: false`, so its English fallback never wins):
 *  - Info.plist `NSHealthShareUsageDescription` = the catalogue's base (en) text;
 *  - `InfoPlist.strings` for all 11 locales through Expo's own `locales`
 *    mechanism (set by the dangerous mod, which runs before Expo's xcodeproj
 *    locales mod), from JSON files generated at prebuild time into
 *    apps/mobile/.generated/ios-locales/ (gitignored — the same pattern as the
 *    generated i18n map; scripts/native/gen-ios-locales.mjs writes them by hand).
 * Strings are resolved inside the mods, so evaluating the app config never
 * fails; prebuild FAILS CLOSED when a locale lacks the key.
 *
 * Shared `locales` (merge of N5a with N6, VTID-05180): Expo keeps ONE locale file
 * per .lproj, and the VitanaVoice plugin registers its own
 * (.generated/native-locales/<lproj>.json, NSMicrophoneUsageDescription). A second
 * file for the same .lproj would replace it, so this mod MERGES: it uses the same
 * web-locale → .lproj map (modules/vitana-voice/plugin/native-locales.json — sr is
 * sr-Latn, zh is zh-Hans), reads whatever file is already registered for that
 * .lproj, adds NSHealthShareUsageDescription under `ios`, and points the entry at
 * the combined file. app.config.ts lists the Health Sync plugins BEFORE the voice
 * plugin, so this dangerous mod runs AFTER the voice one (later plugins' mods run
 * first) and sees its entries.
 */
const fs = require('fs');
const path = require('path');
const { withDangerousMod, withInfoPlist } = require('expo/config-plugins');
const { LOCALES, BASE_LOCALE, resolveHealthStrings, escapeStrings } = require('./health-strings');

const OUT_DIR = '.generated/ios-locales';
/** Web locale → iOS .lproj name; the one map the VitanaVoice plugin uses too. */
const LPROJ = require('../modules/vitana-voice/plugin/native-locales.json').ios;

function lprojOf(locale) {
  const lproj = LPROJ[locale];
  if (!lproj) throw new Error(`Health Sync (VTID-05184): no .lproj mapping for locale "${locale}" in native-locales.json.`);
  return lproj;
}

/** The locale object already registered for an .lproj (a file path or an inline object), or {}. */
function readExisting(projectRoot, entry) {
  if (!entry) return {};
  if (typeof entry === 'object') return entry;
  return JSON.parse(fs.readFileSync(path.join(projectRoot, entry), 'utf8'));
}

/**
 * Writes .generated/ios-locales/<lproj>.json, each merged with the locale
 * already registered for that .lproj in `existing` (the config's `locales`).
 * Returns { <lproj>: './.generated/ios-locales/<lproj>.json' }.
 */
function writeLocaleFiles(projectRoot, strings, existing = {}) {
  const dir = path.join(projectRoot, OUT_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const entries = {};
  for (const locale of LOCALES) {
    const lproj = lprojOf(locale);
    const base = readExisting(projectRoot, existing[lproj]);
    const value = escapeStrings(strings[locale].NSHealthShareUsageDescription);
    const merged = { ...base, ios: { ...(base.ios || {}), NSHealthShareUsageDescription: value } };
    fs.writeFileSync(path.join(dir, `${lproj}.json`), `${JSON.stringify(merged, null, 2)}\n`);
    entries[lproj] = `./${OUT_DIR}/${lproj}.json`;
  }
  return entries;
}

/** Pure: the Info.plist change. */
function applyInfoPlist(infoPlist, strings) {
  const next = { ...infoPlist, NSHealthShareUsageDescription: strings[BASE_LOCALE].NSHealthShareUsageDescription };
  delete next.NSHealthUpdateUsageDescription;
  return next;
}

/** Pure: the app config's `locales` with the given (merged) entries on top. */
function withLocaleEntries(config, entries) {
  return { ...config, locales: { ...(config.locales || {}), ...entries } };
}

const withIosHealthLocales = (config, props = {}) => {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults = applyInfoPlist(cfg.modResults, resolveHealthStrings(props));
    return cfg;
  });
  // Dangerous mods run first, so the files exist before Expo's locales (xcodeproj) mod reads them.
  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const entries = writeLocaleFiles(cfg.modRequest.projectRoot, resolveHealthStrings(props), cfg.locales || {});
      // Set here, not at config time: `expo export` and `expo install --check` read
      // `locales` too, and the files exist only from this point on.
      return withLocaleEntries(cfg, entries);
    },
  ]);
  return config;
};

module.exports = withIosHealthLocales;
module.exports.applyInfoPlist = applyInfoPlist;
module.exports.withLocaleEntries = withLocaleEntries;
module.exports.writeLocaleFiles = writeLocaleFiles;
module.exports.OUT_DIR = OUT_DIR;
module.exports.lprojOf = lprojOf;
