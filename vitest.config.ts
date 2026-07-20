import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// Unit-test runner (VTID pending — TEST-COVERAGE baseline).
// Kept separate from vite.config.ts so test tooling can never affect the
// production build. See docs/TEST_COVERAGE_PLAN.md for the build-out plan.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // src/tests/horizontal-cards-*.test.ts are runtime self-check modules
    // imported by feature-flags.ts, not vitest suites — keep them excluded.
    exclude: ['node_modules/**', 'dist/**', 'src/tests/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**', 'src/hooks/**', 'src/context/**', 'src/utils/**', 'src/stores/**', 'src/state/**'],
    },
  },
});
