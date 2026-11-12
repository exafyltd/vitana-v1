/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the two gateway
 * reads the /health dashboard shows, re-implemented natively (the web hooks
 * call `fetch(GATEWAY_API_URL…)` with the web Supabase session):
 *
 *  - the pillar agents' outputs for today: `VitanaPillarAgentsPanel.tsx:31-42`
 *    (`GET /pillar-agents/outputs?date=YYYY-MM-DD`, Bearer only; any failure
 *    renders as "no output");
 *  - the member's open Autopilot suggestions: `use-autopilot.ts:235-245`
 *    (`GET /autopilot/recommendations?status=new,activated&limit=20&role=…`,
 *    Bearer + `X-User-ID` + `X-Vitana-Active-Role`; the phone's role is
 *    `community`, useAutopilotRole.ts:31). `pendingActions` are the
 *    suggestions that are not yet activated (use-autopilot.ts:74-75, 484).
 *
 * `getGateway()` (N1's createGatewayFetch) adds the Bearer token and the
 * `/api/v1` prefix. GET only: no activate / complete / reject / generate.
 */
import { useQuery } from '@tanstack/react-query';
import { getGateway } from '../../../auth/gateway';
import { useAuth } from '../../../auth/AuthProvider';
import type { VitanaPillarKey } from './vitana-index';

async function getJson<T>(path: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await getGateway()(path, { headers });
  const text = await res.text();
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }
  if (!res.ok || (body as { ok?: unknown }).ok === false) throw new Error(`HTTP ${res.status}`);
  return body as T;
}

// ── pillar agents ───────────────────────────────────────────────────────
export interface AgentOutput {
  pillar: VitanaPillarKey;
  date: string;
  subscore_baseline: number;
  subscore_completions: number;
  subscore_data: number;
  subscore_streak: number;
  agent_version: string;
  computed_at: string;
}

export function usePillarAgentOutputs(now: () => Date = () => new Date()) {
  const { session } = useAuth();
  const signedIn = !!session;
  return useQuery({
    queryKey: ['pillar_agents_outputs', 'today', signedIn],
    staleTime: 30_000,
    queryFn: async (): Promise<AgentOutput[]> => {
      if (!signedIn) return [];
      const today = now().toISOString().slice(0, 10);
      try {
        const json = await getJson<{ outputs?: AgentOutput[] }>(`/pillar-agents/outputs?date=${today}`);
        return json.outputs ?? [];
      } catch {
        return [];
      }
    },
  });
}

// ── Autopilot suggestions ───────────────────────────────────────────────
export type ContributionVector = Partial<Record<VitanaPillarKey, number>>;

export interface AutopilotRecommendation {
  id: string;
  title: string;
  summary: string;
  domain: string;
  status: string;
  contribution_vector?: ContributionVector;
}

export interface PendingAction {
  id: string;
  title: string;
  contributionVector?: ContributionVector;
}

export const AUTOPILOT_ROLE = 'community';

export function useAutopilotPending(): { pendingActions: PendingAction[]; pendingCount: number } {
  const { user } = useAuth();
  const userId = user?.id;
  const query = useQuery({
    queryKey: ['autopilot-recommendations', userId ?? null],
    enabled: !!userId,
    queryFn: async (): Promise<PendingAction[]> => {
      const json = await getJson<{ recommendations?: AutopilotRecommendation[] }>(
        `/autopilot/recommendations?status=new,activated&limit=20&role=${encodeURIComponent(AUTOPILOT_ROLE)}`,
        { 'X-User-ID': userId ?? '', 'X-Vitana-Active-Role': AUTOPILOT_ROLE },
      );
      return (json.recommendations ?? []).filter((r) => r.status !== 'activated').map((r) => ({ id: r.id, title: r.title, contributionVector: r.contribution_vector }));
    },
  });
  const pendingActions = query.data ?? [];
  return { pendingActions, pendingCount: pendingActions.length };
}
