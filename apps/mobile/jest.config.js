// VTID-05157 — jest-expo preset; tests live in tests/ (never in app/, where
// every file is a route).
// VTID-05183 — the resolver is resolution.js (aliases + the src/ guard + bare
// packages from apps/mobile/node_modules only), the same table Metro uses.
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  resolver: '<rootDir>/resolution.js',
};
