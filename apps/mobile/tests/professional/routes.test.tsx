/**
 * VTID-05526 (Native Wave 2, role-modes professional lane) — the eight
 * `/professional/*` ledger rows are native: each web path resolves to a
 * concrete Expo Router file under app/(app)/professional/ (reachable on a cold
 * start — no other app/ file shadows it), the file renders its screen, and
 * the ledger says `native`. Red on origin/main (rows `not_started`, files
 * missing).
 */
import '../helpers/no-network';
import './mocks';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { ComponentType } from 'react';
import { screen } from '@testing-library/react-native';
import { renderProfessional } from './helpers';
import { NATIVE_ROUTES, resolveWebPath } from '../../src/navigation/resolve';

const APP = join(__dirname, '../../app');
const ledger = JSON.parse(readFileSync(join(__dirname, '../../parity/ledger.json'), 'utf8')) as {
  rows: Array<{ key: string; web_path: string; status: string; lane: string; source: string; scope: string }>;
};

const ROUTES = ['billing', 'dashboard', 'education', 'patients', 'profile', 'referrals', 'schedule', 'tools'];

describe('professional rows are native', () => {
  it.each(ROUTES)('/professional/%s is native in the ledger (lane/source/scope unchanged)', (r) => {
    const row = ledger.rows.find((x) => x.key === `/professional/${r}`);
    expect(row).toMatchObject({ web_path: `/professional/${r}`, status: 'native', lane: 'role-modes', source: 'role-route', scope: 'in' });
  });

  it('the ledger has no other /professional row', () => {
    expect(ledger.rows.filter((x) => x.web_path.startsWith('/professional')).map((x) => x.key).sort()).toEqual(ROUTES.map((r) => `/professional/${r}`));
  });

  it.each(ROUTES)('/professional/%s resolves to a native route', (r) => {
    expect(NATIVE_ROUTES).toContain(`/professional/${r}`);
    const res = resolveWebPath(`/professional/${r}`);
    expect(res.kind).toBe('native');
    expect(res.href).toBe(`/professional/${r}`);
  });

  it('app/(app)/professional holds exactly the eight route files, no index or layout shadowing them', () => {
    expect(readdirSync(join(APP, '(app)/professional')).sort()).toEqual(ROUTES.map((r) => `${r}.tsx`));
    expect(existsSync(join(APP, '(app)/professional.tsx'))).toBe(false);
  });

  it.each(ROUTES)('app/(app)/professional/%s.tsx renders screen-professional-%s', async (r) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Route = require(join(APP, '(app)/professional', `${r}.tsx`)).default as ComponentType;
    renderProfessional(<Route />);
    expect(await screen.findByTestId(`screen-professional-${r}`)).toBeTruthy();
  });
});
