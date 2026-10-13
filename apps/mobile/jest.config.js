// VTID-05157 — jest-expo preset; tests live in tests/ (never in app/, where
// every file is a route). VTID-05182: the two exact `@web/…` aliases
// (web-aliases.js), as in Metro.
const { WEB_ALIASES } = require('./web-aliases');

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: Object.fromEntries(Object.entries(WEB_ALIASES).map(([alias, file]) => [`^${escape(alias)}$`, file])),
};
