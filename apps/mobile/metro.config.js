// VTID-05157 — Metro config. The app reuses the web app's i18n shards
// (src/i18n/<locale>/*.json at the repo root) read-only, so Metro must watch
// that folder: it sits outside this project root.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders || []), path.resolve(__dirname, '../../src/i18n')];

module.exports = config;
