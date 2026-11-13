/**
 * VTID-05685 (native-parity-test-gaps) — ledger row INTENTS.MINE (`/intents/mine`, status native):
 * the route file is a redirect to the Find a Partner "My Posts" view, as the web mobile branch does
 * (`MyIntents.tsx`). No network; the route renders with the expo-router fake of ./mocks.
 */
import '../helpers/no-network';
import './mocks';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render } from '@testing-library/react-native';
import { redirectCalls } from './mocks';
import MyIntentsRoute from '../../app/(app)/intents/mine';
import { NATIVE_ROUTES } from '../../src/navigation/resolve';

const ledger = JSON.parse(readFileSync(join(__dirname, '../../parity/ledger.json'), 'utf8')) as {
  rows: Array<{ key: string; web_path: string; status: string; lane: string; source: string; scope: string }>;
};

beforeEach(() => {
  redirectCalls.length = 0;
});

describe('/intents/mine route (INTENTS.MINE)', () => {
  it('redirects to the Find a Partner "My Posts" view, query string included', () => {
    render(<MyIntentsRoute />);
    expect(redirectCalls).toEqual([{ href: '/comm/find-partner?view=posts' }]);
  });

  it('redirects exactly once and renders nothing of its own', () => {
    const view = render(<MyIntentsRoute />);
    expect(redirectCalls).toHaveLength(1);
    expect(view.toJSON()).toBeNull();
  });

  it('is native in the ledger and listed in NATIVE_ROUTES', () => {
    expect(ledger.rows.find((r) => r.key === 'INTENTS.MINE')).toMatchObject({
      web_path: '/intents/mine',
      status: 'native',
      lane: 'home-feed',
      source: 'registry',
      scope: 'in',
    });
    expect(NATIVE_ROUTES).toContain('/intents/mine');
  });
});
