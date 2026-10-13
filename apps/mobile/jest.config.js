// VTID-05157 — jest-expo preset; tests live in tests/ (never in app/, where
// every file is a route).
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};
