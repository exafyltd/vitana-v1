/**
 * VTID-05457 (native-wave2-health-biology-r3/vitana-index-biology) — consent /
 * no-write (plan.md test plan "Consent / no-write checks", lane acceptance
 * "lab-report read is RLS-scoped, no non-GET"): with both screens rendered
 * and every control pressed (each tab, every dialog and sheet, the disabled
 * submits, the card-strip X), the native code built ONLY selects scoped to
 * `user_id = auth.uid()`, no write RPC, no storage call, and every gateway
 * call is a GET with the Bearer token. The exact requests are asserted.
 */
import '../../helpers/no-network';
import { searchParams } from '../mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { VitanaIndexDetailScreen } from '../../../src/screens/health/VitanaIndexDetailScreen';
import { MyBiologyScreen } from '../../../src/screens/health/MyBiologyScreen';
import { SHELL_TABLES, TOKEN, USER_ID, healthOnly } from '../helpers';
import { biologyWrapper } from './fixtures';

beforeEach(() => {
  searchParams.current = {};
  jest.clearAllMocks();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const settle = () =>
  act(async () => {
    await new Promise((res) => setTimeout(res, 0));
  });

const pressIfPresent = (id: string) => {
  const el = screen.queryByTestId(id);
  if (el) fireEvent.press(el);
};

function assertReadsOnly(sb: ReturnType<typeof biologyWrapper>['sb'], gw: ReturnType<typeof biologyWrapper>['gw']) {
  expect(sb.requests.filter((r) => r.method !== 'select')).toEqual([]);
  const health = healthOnly(sb.requests).filter((r) => !SHELL_TABLES.has(r.table));
  expect(health.length).toBeGreaterThan(0);
  for (const r of health) expect({ table: r.table, scoped: r.filters.some(([op, c, v]) => op === 'eq' && c === 'user_id' && v === USER_ID) }).toEqual({ table: r.table, scoped: true });
  expect(healthOnly(sb.rpcCalls)).toEqual([]);
  expect(sb.storageCalls).toEqual([]);
  for (const r of gw.requests) expect({ path: r.path, method: r.method, auth: r.headers.authorization }).toEqual({ path: r.path, method: 'GET', auth: `Bearer ${TOKEN}` });
}

it('/health/vitana-index: the blood-panel read is the exact scoped select; everything else is a read', async () => {
  const { wrapper, sb, gw } = biologyWrapper();
  render(<VitanaIndexDetailScreen />, { wrapper });
  await waitFor(() => expect(screen.getByTestId('mission-alignment-body')).toBeTruthy());
  await waitFor(() => expect(screen.getByTestId('vitana-card-strip-vitana-index')).toBeTruthy());
  expect(sb.requests.filter((r) => r.table === 'lab_reports')).toEqual([
    {
      table: 'lab_reports',
      method: 'select',
      columns: 'id',
      filters: [
        ['eq', 'user_id', USER_ID],
        ['eq', 'report_type', 'blood_panel'],
      ],
      order: [],
      limit: 1,
    },
  ]);
  fireEvent.press(screen.getByTestId('vitana-index-refresh'));
  fireEvent.press(screen.getByTestId('vitana-index-log'));
  await waitFor(() => expect(screen.getByTestId('log-data-submit')).toBeTruthy());
  fireEvent.changeText(screen.getByTestId('log-data-value'), '2000');
  fireEvent.press(screen.getByTestId('log-data-submit'));
  fireEvent.press(screen.getByTestId('log-data-cancel'));
  pressIfPresent('vitana-card-E1-dismiss');
  pressIfPresent('vitana-card-G3-dismiss');
  fireEvent.press(screen.getByTestId('vitana-index-how-toggle'));
  await settle();
  assertReadsOnly(sb, gw);
  expect(gw.requests.map((r) => r.path).sort()).toEqual(expect.arrayContaining(['/autopilot/recommendations', '/enrichment-cards', '/pillar-agents/outputs']));
  expect(gw.requests.map((r) => r.path)).not.toContain('/integrations/manual/log');
  expect(gw.requests.map((r) => r.path)).not.toContain('/enrichment-cards/dismiss');
}, 30_000);

it('/health/my-biology: lab_reports and user_supplements are scoped selects; no insert / update / delete, no storage (upload, signed URL)', async () => {
  const { wrapper, sb, gw } = biologyWrapper();
  render(<MyBiologyScreen />, { wrapper });
  await waitFor(() => expect(screen.getByTestId('biology-report-r1')).toBeTruthy());
  fireEvent.press(screen.getByTestId('biology-report-r1'));
  fireEvent.press(screen.getByTestId('biology-medical-upload'));
  await waitFor(() => expect(screen.getByTestId('health-upload-submit')).toBeTruthy());
  fireEvent.press(screen.getByTestId('health-upload-submit'));
  fireEvent.press(screen.getByTestId('health-upload-sheet-close'));
  fireEvent.press(screen.getByTestId('biology-medical-connect'));
  fireEvent.press(screen.getByTestId('biology-tabs-omics'));
  fireEvent.press(screen.getByTestId('biology-omics-connect'));
  fireEvent.press(screen.getByTestId('biology-tabs-supplements'));
  await waitFor(() => expect(screen.getByTestId('biology-supplement-s1')).toBeTruthy());
  fireEvent.press(screen.getByTestId('biology-supplement-delete-s1'));
  fireEvent.press(screen.getByTestId('biology-supplement-edit-s1'));
  await waitFor(() => expect(screen.getByTestId('supplement-form-submit')).toBeTruthy());
  fireEvent.press(screen.getByTestId('supplement-form-submit'));
  fireEvent.press(screen.getByTestId('supplement-form-cancel'));
  fireEvent.press(screen.getByTestId('biology-add-data'));
  await waitFor(() => expect(screen.getByTestId('biomarker-action-downloadResults')).toBeTruthy());
  fireEvent.press(screen.getByTestId('biomarker-action-downloadResults'));
  await settle();
  const lab = sb.requests.filter((r) => r.table === 'lab_reports');
  expect(lab[0]).toEqual({ table: 'lab_reports', method: 'select', columns: '*', filters: [['eq', 'user_id', USER_ID]], order: [['created_at', { ascending: false }]] });
  const supp = sb.requests.filter((r) => r.table === 'user_supplements');
  expect(supp[0]).toEqual({ table: 'user_supplements', method: 'select', columns: '*', filters: [['eq', 'user_id', USER_ID]], order: [['created_at', { ascending: false }]] });
  assertReadsOnly(sb, gw);
}, 30_000);
