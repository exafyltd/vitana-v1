// VTID-05157 / VTID-05183 — Metro config.
// The app reads web code read-only from the repo root: the i18n shards
// (src/i18n, Wave 0) and, through @vitana/core, the modules listed in
// packages/core/closure.generated.json. Both folders sit outside this project
// root, so Metro watches ../../src and ../../packages. Aliases and the guard
// live in resolution.js (the one table Metro, Jest and tsconfig share).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { metroResolveRequest } = require('./resolution');

const config = getDefaultConfig(__dirname);
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, '../../src'),
  path.resolve(__dirname, '../../packages'),
];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;
config.resolver.resolveRequest = metroResolveRequest;

module.exports = config;
