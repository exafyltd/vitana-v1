// VTID-05157 — Metro config. The app reuses the web app's i18n shards
// (src/i18n/<locale>/*.json at the repo root) read-only, so Metro must watch
// that folder: it sits outside this project root.
//
// VTID-05182 (N6d, plan Change 19) — the ORB's navigation planner and view
// profile come from the web app through two exact `@web/…` aliases
// (web-aliases.js); every other `@web/…` specifier fails to resolve.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { WEB_WATCH_FOLDERS, resolveWebAlias } = require('./web-aliases');

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders || []), path.resolve(__dirname, '../../src/i18n'), ...WEB_WATCH_FOLDERS];

const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const web = resolveWebAlias(moduleName);
  if (web) return { type: 'sourceFile', filePath: web };
  return upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
