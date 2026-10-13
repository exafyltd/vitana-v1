/**
 * VTID-05184 — the HealthKit permission purpose string, resolved from the web
 * catalogue (N5a plan change 4; the keys come from N5b, VTID-05185).
 *
 * No user-visible string is hardcoded in a plugin, Swift or Kotlin file. The
 * value of `screens.nativeHealthSync.osPermission.iosShareUsage` is read from
 * src/i18n/<locale>/*.json for all 11 GA locales. A missing or empty value in
 * ANY locale FAILS CLOSED (prebuild stops with a clear message) instead of
 * falling back to German or to the library's English default.
 */
const fs = require('fs');
const path = require('path');

const LOCALES = ['de', 'en', 'es', 'sr', 'fr', 'pl', 'pt', 'ru', 'tr', 'zh', 'ar'];
const SHARE_USAGE_KEY = 'screens.nativeHealthSync.osPermission.iosShareUsage';
const DEFAULT_I18N_DIR = path.resolve(__dirname, '../../../src/i18n');
/** The development region of the iOS project: the base Info.plist value. */
const BASE_LOCALE = 'en';

function isShard(file) {
  return file.endsWith('.json') && !file.endsWith('_audit.json');
}

/** Same composition as the web and native loaders: shards in sorted order, top-level keys merged. */
function loadCatalog(i18nDir, locale) {
  const dir = path.join(i18nDir, locale);
  if (!fs.existsSync(dir)) return {};
  const out = {};
  for (const f of fs.readdirSync(dir).filter(isShard).sort()) Object.assign(out, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  return out;
}

function lookup(catalog, key) {
  let v = catalog;
  for (const part of key.split('.')) {
    if (v && typeof v === 'object' && part in v) v = v[part];
    else return undefined;
  }
  return typeof v === 'string' ? v : undefined;
}

class MissingHealthStringError extends Error {}

/**
 * { locale: { NSHealthShareUsageDescription } } for all 11 locales, or throws
 * MissingHealthStringError naming the key and every locale that lacks it.
 */
function resolveHealthStrings({ i18nDir = DEFAULT_I18N_DIR } = {}) {
  const out = {};
  const missing = [];
  for (const locale of LOCALES) {
    const value = lookup(loadCatalog(i18nDir, locale), SHARE_USAGE_KEY);
    if (typeof value !== 'string' || value.trim() === '') missing.push(locale);
    else out[locale] = { NSHealthShareUsageDescription: value.trim() };
  }
  if (missing.length) {
    throw new MissingHealthStringError(
      `Health Sync (VTID-05184): the HealthKit permission text "${SHARE_USAGE_KEY}" is missing or empty in ${missing.join(', ')} ` +
        `(${i18nDir}). It comes from N5b (VTID-05185, src/i18n/**), which must be merged first. ` +
        'The build stops here instead of shipping a fallback or English default text.',
    );
  }
  return out;
}

/** InfoPlist.strings value escaping (Expo's own writer does not escape). */
function escapeStrings(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

module.exports = { LOCALES, SHARE_USAGE_KEY, BASE_LOCALE, DEFAULT_I18N_DIR, MissingHealthStringError, resolveHealthStrings, escapeStrings, loadCatalog, lookup };
