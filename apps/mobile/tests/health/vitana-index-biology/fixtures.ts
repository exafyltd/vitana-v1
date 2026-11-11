/**
 * VTID-05457 (native-wave2-health-biology-r3/vitana-index-biology) — fixtures
 * for the Index-detail and biology tests, on top of health-hub's harness
 * (tests/health/helpers.tsx: the recording Supabase double — every built
 * request is kept — and N1's real gateway client over a fake fetch). No
 * network: each test file imports `../../helpers/no-network` first.
 */
import { agentOutputs, fullTables, gatewayRoutes, healthWrapper, recommendations, type GwReq, type Route, type TableFixture } from '../helpers';
import { configure } from '@testing-library/react-native';

// Screens load async (kit, catalogs, queries); give findBy/waitFor room on a loaded runner.
configure({ asyncUtilTimeout: 5000 });

/** The Mission Alignment queue: 4 rows — 2 pillars, 2 economic axes, 1 row with neither. */
export const missionRows = [
  { id: 'm1', title: 'Walk', pillar_impact: { primary_pillar: 'exercise', magnitude: 'high' }, economic_axis: 'none' },
  { id: 'm2', title: 'Sleep early', pillar_impact: { primary_pillar: 'sleep', magnitude: 'medium' }, economic_axis: 'marketplace' },
  { id: 'm3', title: 'Find a partner', pillar_impact: null, economic_axis: 'find_match' },
  { id: 'm4', title: 'Unaligned', pillar_impact: null, economic_axis: null },
];

/** An enrichment card (E1), the G3 boost card with a 12-day streak (placed on vitana-index) and G1 (a boost NOT placed there). */
export const serverCards = [
  { card_type: 'E1', category: 'enrichment', priority: 10, title: '', description: '' },
  { card_type: 'G3', category: 'boost', priority: 9, title: '', description: '', data: { streak_days: 12 } },
  { card_type: 'G1', category: 'boost', priority: 8, title: 'Not on this screen', description: '' },
];

/** `GET /autopilot/recommendations`: the Mission Alignment query (limit=200, status=new) or the chip's pending list. */
export function recommendationsRoute(mission: unknown = { ok: true, recommendations: missionRows }): Route {
  return (req: GwReq) => (req.query.get('limit') === '200' ? mission : { ok: true, recommendations });
}

export function biologyRoutes(over: Record<string, Route> = {}): Record<string, Route> {
  return {
    ...gatewayRoutes,
    'GET /pillar-agents/outputs': { outputs: agentOutputs },
    'GET /autopilot/recommendations': recommendationsRoute(),
    'GET /enrichment-cards': { ok: true, cards: serverCards, profile_completion_pct: 60 },
    ...over,
  };
}

export function biologyWrapper(opts: { tables?: Record<string, TableFixture>; routes?: Record<string, Route>; language?: string } = {}) {
  return healthWrapper({ tables: opts.tables ?? fullTables(), routes: opts.routes ?? biologyRoutes(), language: opts.language });
}
