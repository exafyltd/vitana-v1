/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the consent /
 * no-write test (plan "Consent / no-write checks", tasks.md health-hub task 7):
 * the native health-data module builds the SAME RLS-scoped reads as the web
 * (`user_id = auth.uid()`), never writes (no insert / update / upsert /
 * delete, no write RPC such as `health_compute_vitana_index`, no storage
 * call), and every gateway call is a GET with the Bearer token. Asserted on
 * the built requests while the whole dashboard, every mode, both sheets and
 * the Index overlay are rendered and pressed.
 */
import '../helpers/no-network';
import { searchParams } from './mocks';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { HealthScreen } from '../../src/screens/health/HealthScreen';
import { fetchVitanaIndex, INDEX_SELECT_COLUMNS, toVitanaIndexState, windowStart, type VitanaIndexScoreRow } from '../../src/screens/health/data/vitana-index';
import { normalizeHealthSummary } from '../../src/screens/health/data/records';
import { SHELL_RPCS, SHELL_TABLES, TOKEN, USER_ID, healthOnly, healthWrapper, indexRows, recordingSupabase } from './helpers';

beforeEach(() => {
  searchParams.current = {};
  jest.clearAllMocks();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

describe('fetchVitanaIndex builds the web reads (useVitanaIndex.ts:95-155)', () => {
  it('the trailing 7-day window: vitana_index_scores, the web columns, user_id = auth.uid(), date >= today−6, oldest first', async () => {
    const sb = recordingSupabase({ vitana_index_scores: indexRows() });
    const now = new Date();
    const state = await fetchVitanaIndex(sb.client, USER_ID, now);
    expect(sb.requests).toEqual([
      {
        table: 'vitana_index_scores',
        method: 'select',
        columns: INDEX_SELECT_COLUMNS,
        filters: [
          ['eq', 'user_id', USER_ID],
          ['gte', 'date', windowStart(now)],
        ],
        order: [['date', { ascending: true }]],
      },
    ]);
    expect(state?.total).toBe(412);
    expect(sb.rpcCalls).toEqual([]);
  });

  it('an empty window falls back to the latest-ever row — and never calls the compute RPC (a write)', async () => {
    const old = indexRows().slice(0, 1).map((r) => ({ ...r, date: '2026-01-01', score_total: 250 }));
    const sb = recordingSupabase({ vitana_index_scores: old });
    const state = await fetchVitanaIndex(sb.client, USER_ID);
    expect(sb.requests).toHaveLength(2);
    expect(sb.requests[1]).toEqual({
      table: 'vitana_index_scores',
      method: 'select',
      columns: INDEX_SELECT_COLUMNS,
      filters: [['eq', 'user_id', USER_ID]],
      order: [['date', { ascending: false }]],
      limit: 1,
    });
    expect(state?.total).toBe(250);
    expect(sb.rpcCalls.map((c) => c.name)).not.toContain('health_compute_vitana_index');
    expect(sb.rpcCalls).toEqual([]);
  });

  it('signed out: no read at all', async () => {
    const sb = recordingSupabase({ vitana_index_scores: indexRows() });
    expect(await fetchVitanaIndex(sb.client, undefined)).toBeNull();
    expect(sb.requests).toEqual([]);
  });

  it('toVitanaIndexState: tier, trend, balance, subscores, pillar defaults (useVitanaIndex.ts:158-220)', () => {
    const rows: VitanaIndexScoreRow[] = indexRows();
    rows[6] = { ...rows[6], score_mental: null };
    const s = toVitanaIndexState(rows)!;
    expect(s.trend).toBe('up');
    expect(s.tier.labelKey).toBe('vitanaIndex.tiers.building');
    expect(s.balanceFactor).toBe(0.9);
    expect(s.pillars.mental).toBe(10);
    expect(s.subscores?.sleep).toEqual({ baseline: 20, completions: 10, data: 20, streak: 10 });
    expect(s.subscores?.nutrition).toEqual({ baseline: 0, completions: 0, data: 0, streak: 0 });
    expect(s.history).toHaveLength(7);
    expect(toVitanaIndexState([])).toBeNull();
  });

  it('normalizeHealthSummary only vouches for a standing the server marked available', () => {
    expect(normalizeHealthSummary({ standing: { available: true, top_percent: 12, cohort_size: 50 } })?.standing).toEqual({ available: true, topPercent: 12, communityAverage: null, cohortSize: 50 });
    expect(normalizeHealthSummary({ standing: { available: false, top_percent: 12 } })?.standing).toEqual({ available: false, topPercent: null, communityAverage: null, cohortSize: 0 });
    expect(normalizeHealthSummary(null)).toBeNull();
  });
});

describe('the whole dashboard reads only, scoped to the member', () => {
  it('every Supabase request is a select with user_id = auth.uid(); the only RPC is the summary as a GET; gateway calls are GETs with Bearer', async () => {
    const { wrapper, sb, gw } = healthWrapper();
    const a = render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('autopilot-chip-badge')).toBeTruthy());
    fireEvent.press(screen.getByTestId('health-snapshot'));
    await waitFor(() => expect(screen.getByTestId('vitana-index-sheet-compass')).toBeTruthy());
    fireEvent.press(screen.getByTestId('vitana-index-sheet-close'));
    fireEvent.press(screen.getByTestId('health-upload-button'));
    await waitFor(() => expect(screen.getByTestId('health-upload-submit')).toBeTruthy());
    fireEvent.press(screen.getByTestId('health-upload-submit'));
    fireEvent.press(screen.getByTestId('health-upload-file-zone'));
    a.unmount();
    searchParams.current = { mode: 'medical' };
    const b = render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('health-report-r1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('health-report-r1'));
    b.unmount();
    searchParams.current = { mode: 'supplements' };
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('supplement-delete-s1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('supplement-delete-s1'));

    // Nothing is written, by the health module or anything else on the screen.
    for (const r of sb.requests) expect({ table: r.table, method: r.method }).toEqual({ table: r.table, method: 'select' });
    const health = healthOnly(sb.requests);
    expect([...new Set(health.map((r) => r.table))].sort()).toEqual(['calendar_events', 'lab_reports', 'life_compass', 'user_supplements', 'vitana_index_scores']);
    for (const r of health) {
      expect({ table: r.table, scoped: r.filters.some(([op, c, v]) => op === 'eq' && c === 'user_id' && v === USER_ID) }).toEqual({ table: r.table, scoped: true });
    }
    expect(sb.requests.every((r) => health.includes(r) || SHELL_TABLES.has(r.table))).toBe(true);
    expect(sb.rpcCalls.every((c) => c.name === 'get_profile_health_summary' || SHELL_RPCS.has(c.name))).toBe(true);
    const healthRpcs = healthOnly(sb.rpcCalls);
    expect(healthRpcs.length).toBeGreaterThan(0);
    for (const c of healthRpcs) {
      expect(c).toEqual({ name: 'get_profile_health_summary', args: { p_user_id: USER_ID }, options: { get: true } });
    }
    expect(sb.storageCalls).toEqual([]);

    const paths = new Set(gw.requests.map((r) => r.path));
    expect(paths).toContain('/pillar-agents/outputs');
    expect(paths).toContain('/autopilot/recommendations');
    expect(paths).toContain('/health/baseline-survey/status');
    for (const r of gw.requests) {
      expect({ path: r.path, method: r.method, auth: r.headers.authorization }).toEqual({ path: r.path, method: 'GET', auth: `Bearer ${TOKEN}` });
    }
    const ap = gw.requests.find((r) => r.path === '/autopilot/recommendations')!;
    expect(Object.fromEntries(ap.query)).toEqual({ status: 'new,activated', limit: '20', role: 'community' });
    expect(ap.headers['x-vitana-active-role']).toBe('community');
    expect(ap.headers['x-user-id']).toBe(USER_ID);
    expect(gw.requests.find((r) => r.path === '/pillar-agents/outputs')!.query.get('date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }, 30_000);
});
