/**
 * VTID-05527 (Native Wave 2, role-modes staff lane) — the eight `/staff/*`
 * ledger rows are native: each web path resolves to a concrete Expo Router
 * file under app/(app)/staff/ (reachable on a cold start — no other app/ file
 * shadows it), the file renders its screen, and the ledger says `native`.
 * Red on origin/main (rows `not_started`, files missing).
 */
import '../helpers/no-network';
import './mocks';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { ComponentType } from 'react';
import { screen } from '@testing-library/react-native';
import { renderStaff } from './helpers';
import { NATIVE_ROUTES, resolveWebPath } from '../../src/navigation/resolve';

const APP = join(__dirname, '../../app');
const ledger = JSON.parse(readFileSync(join(__dirname, '../../parity/ledger.json'), 'utf8')) as {
  rows: Array<{ key: string; web_path: string; status: string; lane: string; source: string; scope: string }>;
};

const ROUTES = ['communications', 'dashboard', 'queue', 'reports', 'schedule', 'tasks', 'time', 'tools'];

describe('staff rows are native', () => {
  it.each(ROUTES)('/staff/%s is native in the ledger (lane/source/scope unchanged)', (r) => {
    const row = ledger.rows.find((x) => x.key === `/staff/${r}`);
    expect(row).toMatchObject({ web_path: `/staff/${r}`, status: 'native', lane: 'role-modes', source: 'role-route', scope: 'in' });
  });

  it('the ledger has no other /staff row', () => {
    expect(ledger.rows.filter((x) => x.web_path.startsWith('/staff')).map((x) => x.key).sort()).toEqual(ROUTES.map((r) => `/staff/${r}`));
  });

  it.each(ROUTES)('/staff/%s resolves to a native route', (r) => {
    expect(NATIVE_ROUTES).toContain(`/staff/${r}`);
    const res = resolveWebPath(`/staff/${r}`);
    expect(res.kind).toBe('native');
    expect(res.href).toBe(`/staff/${r}`);
  });

  it('app/(app)/staff holds exactly the eight route files, no index or layout shadowing them', () => {
    expect(readdirSync(join(APP, '(app)/staff')).sort()).toEqual(ROUTES.map((r) => `${r}.tsx`));
    expect(existsSync(join(APP, '(app)/staff.tsx'))).toBe(false);
    expect(existsSync(join(APP, 'staff'))).toBe(false);
  });

  it.each(ROUTES)('app/(app)/staff/%s.tsx renders screen-staff-%s', async (r) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Route = require(join(APP, '(app)/staff', `${r}.tsx`)).default as ComponentType;
    renderStaff(<Route />);
    expect(await screen.findByTestId(`screen-staff-${r}`)).toBeTruthy();
  });
});
