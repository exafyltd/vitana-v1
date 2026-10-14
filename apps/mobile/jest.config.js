// VTID-05157 — jest-expo preset; tests live in tests/ (never in app/, where
// every file is a route).
// VTID-05183 — the resolver is resolution.js (aliases + the src/ guard + bare
// packages from apps/mobile/node_modules only), the same table Metro uses; it
// also holds the @vitana/ui / @vitana/tokens aliases.
// VTID-05176 — the UI kit's setup file and the lucide CommonJS mapping.
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  resolver: '<rootDir>/resolution.js',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    // lucide-react-native's "react-native" entry is untranspiled ESM (.mjs); jest takes its CommonJS build.
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
};
