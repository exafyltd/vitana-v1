/**
 * VTID-05652 (native-wave2-fix-forward-r2/test-timeouts) — tests/community/helpers.tsx
 * gives findBy and waitFor a 5 s wait budget and the test a 30 s budget, the same
 * as tests/settings/helpers.tsx, so the suite holds under default-worker load.
 * Importing the helper is what every community test does; the check reads back the RNTL
 * config and the budget jest-circus will apply to this file's tests.
 */
import '../helpers/no-network';
import '../helpers/mocks';
import '../community/helpers';
import { getConfig } from '@testing-library/react-native/build/config';

// jest-circus keeps the value set by jest.setTimeout under this symbol.
const testTimeout = (): unknown => (globalThis as Record<symbol, unknown>)[Symbol.for('TEST_TIMEOUT_SYMBOL')];

describe('tests/community/helpers.tsx wait budget', () => {
  it('sets asyncUtilTimeout to 5000', () => {
    expect(getConfig().asyncUtilTimeout).toBe(5000);
  });
  it('sets the jest test timeout to 30000', () => {
    expect(testTimeout()).toBe(30000);
  });
});
