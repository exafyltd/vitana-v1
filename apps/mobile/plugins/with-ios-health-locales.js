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
 */
const fs = require('fs');
const path = require('path');
const { withDangerousMod, withInfoPlist } = require('expo/config-plugins');
const { LOCALES, BASE_LOCALE, resolveHealthStrings, escapeStrings } = require('./health-strings');

const OUT_DIR = '.generated/ios-locales';

/** Writes .generated/ios-locales/<locale>.json; returns the written paths. */
function writeLocaleFiles(projectRoot, strings) {
  const dir = path.join(projectRoot, OUT_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const written = [];
  for (const locale of LOCALES) {
    const file = path.join(dir, `${locale}.json`);
    const value = escapeStrings(strings[locale].NSHealthShareUsageDescription);
    fs.writeFileSync(file, `${JSON.stringify({ NSHealthShareUsageDescription: value }, null, 2)}\n`);
    written.push(file);
  }
  return written;
}

/** Pure: the Info.plist change. */
function applyInfoPlist(infoPlist, strings) {
  const next = { ...infoPlist, NSHealthShareUsageDescription: strings[BASE_LOCALE].NSHealthShareUsageDescription };
  delete next.NSHealthUpdateUsageDescription;
  return next;
}

/** Pure: the app config's `locales` entries pointing at the generated files. */
function withLocaleEntries(config) {
  const locales = { ...(config.locales || {}) };
  for (const locale of LOCALES) locales[locale] = `${OUT_DIR}/${locale}.json`;
  return { ...config, locales };
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
      writeLocaleFiles(cfg.modRequest.projectRoot, resolveHealthStrings(props));
      // Set here, not at config time: `expo export` and `expo install --check` read
      // `locales` too, and the files exist only from this point on.
      return withLocaleEntries(cfg);
    },
  ]);
  return config;
};

module.exports = withIosHealthLocales;
module.exports.applyInfoPlist = applyInfoPlist;
module.exports.withLocaleEntries = withLocaleEntries;
module.exports.writeLocaleFiles = writeLocaleFiles;
module.exports.OUT_DIR = OUT_DIR;
