// VTID-05182 (native N6d, plan Change 19) — the only web files the native app
// imports, until N1's `@vitana/core` re-export layer carries them. Each alias
// names exactly one file; any other `@web/…` specifier does not resolve.
// Read by metro.config.js and jest.config.js; tsconfig.json `paths` mirrors it
// (tests/orb/web-aliases.test.ts keeps the three in step).
//   orb-navigation.ts imports only ./registry (screens.json + locales, pure);
//   orb-view-profile.ts imports nothing.
const path = require('path');

const REPO = path.resolve(__dirname, '../..');

const WEB_ALIASES = {
  '@web/navigation/orb-navigation': path.join(REPO, 'src/navigation/orb-navigation.ts'),
  '@web/lib/orb-view-profile': path.join(REPO, 'src/lib/orb-view-profile.ts'),
};

/** Folders Metro must watch for those files (and the registry they import). */
const WEB_WATCH_FOLDERS = [path.join(REPO, 'src/navigation'), path.join(REPO, 'src/lib')];

/**
 * The file an `@web/…` specifier names, null for any other specifier. An
 * `@web/…` specifier that is not listed above throws.
 */
function resolveWebAlias(moduleName) {
  if (Object.prototype.hasOwnProperty.call(WEB_ALIASES, moduleName)) return WEB_ALIASES[moduleName];
  if (moduleName.startsWith('@web/')) {
    throw new Error(`${moduleName} is not an allowed web import (apps/mobile/web-aliases.js lists the only ones, VTID-05182).`);
  }
  return null;
}

module.exports = { WEB_ALIASES, WEB_WATCH_FOLDERS, resolveWebAlias };
