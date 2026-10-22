/**
 * VTID-05184 — Health Connect READ permissions (N5a plan change 4).
 *
 * The library plugin (react-native-health-connect) adds the rationale intent
 * filter and the Android 14 ViewPermissionUsageActivity alias but NO
 * <uses-permission>. This plugin adds exactly the catalogue's READ permissions,
 * READ_HEALTH_DATA_HISTORY, READ_HEALTH_DATA_IN_BACKGROUND and the <queries>
 * entry for the Health Connect app. Never a WRITE permission.
 * tests/health-sync/config.test.ts compares the list with catalogue.ts.
 */
const { withAndroidManifest } = require('expo/config-plugins');

const HEALTH_CONNECT_PACKAGE = 'com.google.android.apps.healthdata';

const READ_PERMISSIONS = [
  'android.permission.health.READ_STEPS',
  'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
  'android.permission.health.READ_EXERCISE',
  'android.permission.health.READ_DISTANCE',
  'android.permission.health.READ_SLEEP',
  'android.permission.health.READ_HEART_RATE',
  'android.permission.health.READ_RESTING_HEART_RATE',
  'android.permission.health.READ_HEART_RATE_VARIABILITY',
  'android.permission.health.READ_WEIGHT',
  'android.permission.health.READ_BODY_FAT',
];
const EXTRA_PERMISSIONS = ['android.permission.health.READ_HEALTH_DATA_HISTORY', 'android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND'];
const ALL_PERMISSIONS = [...READ_PERMISSIONS, ...EXTRA_PERMISSIONS];

/** Pure: adds the permissions and the <queries> package to a parsed AndroidManifest. */
function applyHealthConnectManifest(manifestRoot) {
  const manifest = manifestRoot.manifest;
  const perms = manifest['uses-permission'] || [];
  const have = new Set(perms.map((p) => p.$ && p.$['android:name']));
  for (const name of ALL_PERMISSIONS) if (!have.has(name)) perms.push({ $: { 'android:name': name } });
  manifest['uses-permission'] = perms;
  const queries = manifest.queries || [];
  const q = queries[0] || {};
  const pkgs = q.package || [];
  if (!pkgs.some((p) => p.$ && p.$['android:name'] === HEALTH_CONNECT_PACKAGE)) pkgs.push({ $: { 'android:name': HEALTH_CONNECT_PACKAGE } });
  q.package = pkgs;
  queries[0] = q;
  manifest.queries = queries;
  return manifestRoot;
}

const withHealthConnectPermissions = (config) =>
  withAndroidManifest(config, (cfg) => {
    cfg.modResults = applyHealthConnectManifest(cfg.modResults);
    return cfg;
  });

module.exports = withHealthConnectPermissions;
module.exports.applyHealthConnectManifest = applyHealthConnectManifest;
module.exports.READ_PERMISSIONS = READ_PERMISSIONS;
module.exports.EXTRA_PERMISSIONS = EXTRA_PERMISSIONS;
module.exports.HEALTH_CONNECT_PACKAGE = HEALTH_CONNECT_PACKAGE;
