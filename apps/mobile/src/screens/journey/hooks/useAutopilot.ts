/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — native twin of
 * `src/hooks/use-autopilot.ts` (594; runtime-imports the web Supabase client,
 * so class-B and re-implemented, not extracted). Same gateway calls, role,
 * mapping and local state:
 *
 *   GET  /autopilot/recommendations/count?role=community          (badge count, on mount + every 5 min)
 *   GET  /autopilot/recommendations?status=new,activated&limit=20&role=community
 *   POST /autopilot/recommendations/generate?role=community       (on-demand regeneration)
 *   POST /autopilot/recommendations/:id/activate?role=community   { draft_text? }
 *   POST /autopilot/recommendations/:id/draft?role=community      { regenerate?, text? }
 *   POST /autopilot/recommendations/:id/complete?role=community   → falls back to /reject
 *   POST /autopilot/recommendations/:id/snooze                    { hours }
 *
 * The client-side "the member completed this" set
 * (`vitana.autopilot.dismissed_ids:<user>`) lives in the native key-value
 * store (AsyncStorage) instead of localStorage, read once per member and
 * pruned against the server list, exactly like the web. The web's badge
 * "pulse" (last-seen count) feeds the app-bar chips of other surfaces and is
 * not rendered on My Journey, so it is not carried here.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { deviceStorage } from '../../../identity/device-storage';
import { autopilotFetch, AUTOPILOT_ROLE } from '../data/client';
import type { AutopilotAction, AutopilotActionStatus, AutopilotCategory, AutopilotPriority, ContributionVector, ExecutionResult } from '../../../ports/journey';
import { useAIConsent } from './useAIConsent';

export type AutopilotGenerateReason = 'daily_cap' | 'disabled' | 'cooldown' | 'no_signals';

export interface AutopilotRecommendation {
  id: string;
  title: string;
  summary: string;
  domain: string;
  risk_level: string;
  impact_score: number;
  effort_score: number;
  estimated_duration: string;
  signal_type: string;
  status: string;
  contribution_vector?: ContributionVector;
  action?: { kind: string; params?: Record<string, unknown> } | null;
}

/**
 * Why the list did not load. The web keeps the raw message ("Fetch failed: 500",
 * the server's `error`, use-autopilot.ts:239-282) and prints it; natively the
 * popup names it through the catalog, so the cause is kept as data.
 */
export type AutopilotLoadError = { kind: 'status'; status: number } | { kind: 'server' } | { kind: 'network' };

class LoadError extends Error {
  constructor(readonly detail: AutopilotLoadError) {
    super(detail.kind);
  }
}

export const DRAFT_KINDS = new Set(['post_to_feed', 'send_chat_message', 'media_upload']);

const ROLE = encodeURIComponent(AUTOPILOT_ROLE);

function domainToCategory(domain: string): AutopilotCategory {
  const map: Record<string, AutopilotCategory> = {
    health: 'health', wellness: 'health', fitness: 'health',
    community: 'community', social: 'community',
    media: 'media', content: 'media',
    discover: 'discover', learning: 'discover',
    calendar: 'calendar', schedule: 'calendar',
  };
  return map[domain?.toLowerCase()] ?? 'discover';
}

function riskToPriority(risk: string): AutopilotPriority {
  const map: Record<string, AutopilotPriority> = { high: 'high', critical: 'high', medium: 'medium', low: 'low' };
  return map[risk?.toLowerCase()] ?? 'medium';
}

function domainToIcon(domain: string): string {
  const map: Record<string, string> = {
    health: '🩺', wellness: '🧘', fitness: '💪',
    community: '👥', social: '🎉',
    media: '📸', content: '✍️',
    discover: '✨', learning: '📚',
    calendar: '📅', schedule: '⏰',
  };
  return map[domain?.toLowerCase()] ?? '✨';
}

/** web recToAction (use-autopilot.ts:73-91). */
export function recToAction(rec: AutopilotRecommendation): AutopilotAction {
  const uiStatus: AutopilotActionStatus = rec.status === 'activated' ? 'executing' : 'pending';
  return {
    id: rec.id,
    title: rec.title,
    reason: rec.summary,
    category: domainToCategory(rec.domain),
    priority: riskToPriority(rec.risk_level),
    timeEstimate: rec.estimated_duration || undefined,
    icon: domainToIcon(rec.domain),
    timestamp: new Date(),
    status: uiStatus,
    selected: uiStatus === 'pending',
    contributionVector: rec.contribution_vector,
    draftKind: rec.action && DRAFT_KINDS.has(rec.action.kind) ? rec.action.kind : undefined,
  };
}

export const dismissedKey = (userId: string) => `vitana.autopilot.dismissed_ids:${userId}`;

export function useAutopilot() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { hasConsent } = useAIConsent();
  const [recommendations, setRecommendations] = useState<AutopilotRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AutopilotLoadError | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateReason, setGenerateReason] = useState<AutopilotGenerateReason | null>(null);
  const [fetchedOnce, setFetchedOnce] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, { status?: AutopilotActionStatus; selected?: boolean }>>({});
  const countInFlight = useRef(false);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    void Promise.resolve(deviceStorage.getItem(dismissedKey(userId))).then((raw: string | null) => {
      if (!active || !raw) return;
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setDismissedIds(new Set(arr.filter((x): x is string => typeof x === 'string')));
      } catch {
        /* unreadable — nothing dismissed */
      }
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const persistDismissed = useCallback(
    (next: Set<string>) => {
      if (userId) void deviceStorage.setItem(dismissedKey(userId), JSON.stringify(Array.from(next)));
    },
    [userId],
  );

  const markDismissedLocally = useCallback(
    (id: string) => {
      setDismissedIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        persistDismissed(next);
        return next;
      });
    },
    [persistDismissed],
  );

  // state.actions: the recommendations minus the client-dismissed ones, with local status/selection on top.
  const actions = useMemo<AutopilotAction[]>(
    () =>
      recommendations
        .filter((r) => !dismissedIds.has(r.id))
        .map((r) => {
          const base = recToAction(r);
          const o = overrides[r.id];
          return o ? { ...base, ...o } : base;
        }),
    [recommendations, dismissedIds, overrides],
  );

  const fetchCount = useCallback(async (): Promise<void> => {
    if (!userId || countInFlight.current) return;
    countInFlight.current = true;
    try {
      await autopilotFetch(`/autopilot/recommendations/count?role=${ROLE}`, userId);
    } catch {
      /* the count only feeds badges */
    } finally {
      countInFlight.current = false;
    }
  }, [userId]);

  const fetchRecommendations = useCallback(async (): Promise<AutopilotRecommendation[]> => {
    if (!userId) return [];
    setLoading(true);
    setError(null);
    try {
      const res = await autopilotFetch(`/autopilot/recommendations?status=new,activated&limit=20&role=${ROLE}`, userId);
      if (!res.ok) throw new LoadError({ kind: 'status', status: res.status });
      const json = await res.json<{ ok?: boolean; recommendations?: AutopilotRecommendation[]; error?: string }>();
      if (!json.ok) throw new LoadError({ kind: 'server' });
      const recs = json.recommendations ?? [];
      setRecommendations(recs);
      setOverrides({});
      const live = new Set(recs.map((r) => r.id));
      setDismissedIds((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set([...prev].filter((id) => live.has(id)));
        if (next.size === prev.size) return prev;
        persistDismissed(next);
        return next;
      });
      return recs;
    } catch (e) {
      setError(e instanceof LoadError ? e.detail : { kind: 'network' });
      return [];
    } finally {
      setLoading(false);
      setFetchedOnce(true);
    }
  }, [userId, persistDismissed]);

  const generateRecommendations = useCallback(async (): Promise<{ ok: boolean; generated: number; reason?: AutopilotGenerateReason } | null> => {
    if (!userId) return null;
    setGenerating(true);
    try {
      const res = await autopilotFetch(`/autopilot/recommendations/generate?role=${ROLE}`, userId, { method: 'POST' });
      if (!res.ok) throw new Error(`Generate failed: ${res.status}`);
      const json = await res.json<{ ok?: boolean; generated?: number; recommendations?: AutopilotRecommendation[]; reason?: AutopilotGenerateReason }>();
      if (!json.ok) return null;
      const generated = Number(json.generated) || 0;
      if (generated > 0 && Array.isArray(json.recommendations)) {
        setRecommendations(json.recommendations);
        setOverrides({});
        setGenerateReason(null);
      } else {
        setGenerateReason(json.reason ?? null);
      }
      return { ok: true, generated, reason: json.reason };
    } catch {
      return null;
    } finally {
      setGenerating(false);
    }
  }, [userId]);

  const activateRecommendation = useCallback(
    async (id: string, opts: { draftText?: string } = {}) => {
      try {
        const res = await autopilotFetch(`/autopilot/recommendations/${id}/activate?role=${ROLE}`, userId, {
          method: 'POST',
          body: JSON.stringify(opts.draftText !== undefined ? { draft_text: opts.draftText } : {}),
        });
        if (!res.ok) throw new Error(`Activate failed: ${res.status}`);
        const json = await res.json<{
          ok: boolean;
          vtid?: string;
          action_type?: 'navigate' | 'notify';
          target?: string;
          completion_message?: string;
          action_result?: { status: string; route?: string } | null;
        }>();
        return json.ok ? json : null;
      } catch {
        return null;
      }
    },
    [userId],
  );

  const fetchDraft = useCallback(
    async (id: string, opts: { regenerate?: boolean; text?: string } = {}) => {
      try {
        const res = await autopilotFetch(`/autopilot/recommendations/${id}/draft?role=${ROLE}`, userId, { method: 'POST', body: JSON.stringify(opts) });
        if (!res.ok) return null;
        return await res.json<{ ok: boolean; kind?: string; draft?: string; error?: string | null }>();
      } catch {
        return null;
      }
    },
    [userId],
  );

  const completeRecommendation = useCallback(
    async (id: string): Promise<{ ok: boolean; reward?: number; via?: 'complete' | 'reject'; status?: number } | null> => {
      let completeStatus: number | undefined;
      try {
        const res = await autopilotFetch(`/autopilot/recommendations/${id}/complete?role=${ROLE}`, userId, { method: 'POST' });
        completeStatus = res.status;
        if (res.ok) {
          const json = await res.json<{ ok?: boolean; reward?: number }>().catch(() => ({ ok: true }) as { ok?: boolean; reward?: number });
          if (json.ok !== false) return { ok: true, ...json, via: 'complete', status: res.status };
        }
      } catch {
        /* fall back to reject */
      }
      try {
        const rejectRes = await autopilotFetch(`/autopilot/recommendations/${id}/reject`, userId, { method: 'POST' });
        if (rejectRes.ok) return { ok: true, via: 'reject', status: completeStatus };
        return null;
      } catch {
        return null;
      }
    },
    [userId],
  );

  const snoozeRecommendation = useCallback(
    async (id: string, hours = 24): Promise<boolean> => {
      try {
        const res = await autopilotFetch(`/autopilot/recommendations/${id}/snooze`, userId, { method: 'POST', body: JSON.stringify({ hours }) });
        if (!res.ok) throw new Error(`Snooze failed: ${res.status}`);
        const json = await res.json<{ ok?: boolean }>();
        if (json.ok) {
          setRecommendations((prev) => prev.filter((r) => r.id !== id));
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [userId],
  );

  useEffect(() => {
    void fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    if (!userId) return undefined;
    const id = setInterval(() => {
      void fetchCount();
      if (hasConsent) void fetchRecommendations();
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [userId, hasConsent, fetchCount, fetchRecommendations]);

  const pendingActions = actions.filter((a) => a.status === 'pending');
  const allVisibleActions = actions.filter((a) => a.status === 'pending' || a.status === 'executing' || a.status === 'completed');
  const selectedActions = pendingActions.filter((a) => a.selected);

  const toggleActionSelection = useCallback(
    (actionId: string) => {
      const a = actions.find((x) => x.id === actionId);
      if (!a || a.status !== 'pending') return;
      setOverrides((prev) => ({ ...prev, [actionId]: { ...prev[actionId], selected: !a.selected } }));
    },
    [actions],
  );

  const setActionStatus = useCallback((actionId: string, status: AutopilotActionStatus) => {
    setOverrides((prev) => ({ ...prev, [actionId]: { ...prev[actionId], status } }));
  }, []);

  const executeActions = async (actionIds: string[], drafts: Record<string, string> = {}): Promise<ExecutionResult[]> => {
    setIsExecuting(true);
    const results: ExecutionResult[] = [];
    for (const id of actionIds) {
      const response = await activateRecommendation(id, { draftText: drafts[id] });
      if (response?.action_result?.status === 'navigate' && response.action_result.route) {
        response.action_type = 'navigate';
        response.target = response.action_result.route;
      }
      if (response) {
        if (response.action_type === 'notify') await completeRecommendation(id);
        setActionStatus(id, 'completed');
        results.push({
          actionId: id,
          success: true,
          message: response.completion_message || `VTID: ${response.vtid}`,
          action_type: response.action_type,
          target: response.target,
          completion_message: response.completion_message,
        });
      } else {
        setActionStatus(id, 'failed');
        results.push({ actionId: id, success: false, message: 'Failed' });
      }
    }
    await fetchCount();
    setIsExecuting(false);
    return results;
  };

  return {
    recommendations,
    pendingActions,
    allVisibleActions,
    selectedActions,
    executeActions,
    toggleActionSelection,
    setActionStatus,
    isExecuting,
    loading,
    error,
    fetchRecommendations,
    activateRecommendation,
    fetchDraft,
    completeRecommendation,
    markDismissedLocally,
    snoozeRecommendation,
    fetchCount,
    generateRecommendations,
    generating,
    generateReason,
    fetchedOnce,
  };
}
