// VTID-05157 — jest-expo preset; tests live in tests/ (never in app/, where
// every file is a route).
// VTID-05176 — the UI kit's setup file and the @vitana/ui / @vitana/tokens
// aliases (same targets as the tsconfig.json `paths`).
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@vitana/ui$': '<rootDir>/src/ui/index.ts',
    '^@vitana/ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@vitana/tokens$': '<rootDir>/src/ui/theme/tokens-stub.ts',
    // lucide-react-native's "react-native" entry is untranspiled ESM (.mjs); jest takes its CommonJS build.
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
};
