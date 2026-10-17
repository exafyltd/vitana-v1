#!/usr/bin/env node
/**
 * VTID-05184 — iOS InfoPlist.strings sources for the HealthKit purpose string
 * (N5a plan change 4).
 *
 * Writes apps/mobile/.generated/ios-locales/<lproj>.json
 * ({ "ios": { "NSHealthShareUsageDescription": "…" } }) for the 11 GA locales from the web
 * catalogue key `screens.nativeHealthSync.osPermission.iosShareUsage` (N5b,
 * VTID-05185). Gitignored, the same pattern as gen-i18n-map.mjs. The config
 * plugin (apps/mobile/plugins/with-ios-health-locales.js) runs the same code
 * during prebuild; this CLI exists to inspect the output and to fail early.
 * A locale without the key fails closed (exit 1) with a message naming it.
 *
 *   node scripts/native/gen-ios-locales.mjs [--i18n-dir <dir>] [--project-root <apps/mobile>]
 */
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const require = createRequire(import.meta.url);
const { resolveHealthStrings, DEFAULT_I18N_DIR } = require('../../apps/mobile/plugins/health-strings.js');
const { writeLocaleFiles } = require('../../apps/mobile/plugins/with-ios-health-locales.js');

export function generate({ i18nDir = DEFAULT_I18N_DIR, projectRoot = resolve(REPO, 'apps/mobile') } = {}) {
  return writeLocaleFiles(projectRoot, resolveHealthStrings({ i18nDir }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? resolve(args[i + 1]) : undefined;
  };
  try {
    const files = generate({ i18nDir: opt('i18n-dir') ?? DEFAULT_I18N_DIR, projectRoot: opt('project-root') });
    console.log(`gen-ios-locales: ${Object.keys(files).length} locale files written`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
