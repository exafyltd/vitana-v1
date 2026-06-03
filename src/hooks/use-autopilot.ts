import { useState, useEffect, useCallback } from "react";
import { AutopilotAction, AutopilotState, AutopilotPriority, AutopilotCategory, ExecutionResult, AutopilotActionStatus, ContributionVector } from "@/types/autopilot";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useAIConsent } from "@/hooks/useAIConsent";

// Reasons the gateway returns when /generate produced nothing — surfaced to
// the UI so it can pick the right empty-state copy instead of a generic one.
export type AutopilotGenerateReason = "daily_cap" | "disabled" | "cooldown" | "no_signals";

export interface AutopilotGenerateResult {
  ok: boolean;
  generated: number;
  reason?: AutopilotGenerateReason;
}

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";


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
}

// Domain → category mapping
function domainToCategory(domain: string): AutopilotCategory {
  const map: Record<string, AutopilotCategory> = {
    health: "health", wellness: "health", fitness: "health",
    community: "community", social: "community",
    media: "media", content: "media",
    discover: "discover", learning: "discover",
    calendar: "calendar", schedule: "calendar",
  };
  return map[domain?.toLowerCase()] ?? "discover";
}

// Risk → priority mapping
function riskToPriority(risk: string): AutopilotPriority {
  const map: Record<string, AutopilotPriority> = { high: "high", critical: "high", medium: "medium", low: "low" };
  return map[risk?.toLowerCase()] ?? "medium";
}

// Domain → icon mapping
function domainToIcon(domain: string): string {
  const map: Record<string, string> = {
    health: "🩺", wellness: "🧘", fitness: "💪",
    community: "👥", social: "🎉",
    media: "📸", content: "✍️",
    discover: "✨", learning: "📚",
    calendar: "📅", schedule: "⏰",
  };
  return map[domain?.toLowerCase()] ?? "✨";
}

function recToAction(rec: AutopilotRecommendation, index: number): AutopilotAction {
  // Map API status to UI status
  const uiStatus: AutopilotActionStatus = rec.status === "activated" ? "executing" : "pending";
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
    selected: uiStatus === "pending", // only pre-select new items
    contributionVector: rec.contribution_vector,
  };
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? "";
  const userId = data.session?.user?.id ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-User-ID": userId,
    "X-Vitana-Active-Role": "community",
  };
}

// Dedup guard for fetchCount
let countInFlight = false;

export function useAutopilot() {
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
  const { preferences } = useUserPreferences();
  const { hasConsent } = useAIConsent();

  const [recommendations, setRecommendations] = useState<AutopilotRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // VTID — on-demand regeneration. `generating` covers a /generate call in
  // flight; `generateReason` holds the guard reason from the last call that
  // produced 0 items (daily_cap / disabled / cooldown / no_signals) so the UI
  // can show the right empty-state copy. `fetchedOnce` gates auto-regeneration
  // so we never fire before the first real list fetch has resolved.
  const [generating, setGenerating] = useState(false);
  const [generateReason, setGenerateReason] = useState<AutopilotGenerateReason | null>(null);
  const [fetchedOnce, setFetchedOnce] = useState(false);

  const [state, setState] = useState<AutopilotState>({
    actions: [],
    isExecuting: false,
    lastUpdate: new Date(),
  });

  // Client-side "user said they did this" set. The gateway revision in
  // prod doesn't persist /complete (and /reject also returns non-2xx for
  // activated rows), so without this the user taps Complete, the row
  // turns green, then the next fetchRecommendations brings it back as
  // executing. Persisted per-user in localStorage so the dismissal
  // survives popup reopens and page reloads until the backend catches
  // up.
  const DISMISSED_KEY = user ? `vitana.autopilot.dismissed_ids:${user.id}` : "";
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (!DISMISSED_KEY) return new Set();
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === "string")) : new Set();
    } catch {
      return new Set();
    }
  });

  const markDismissedLocally = useCallback((id: string) => {
    setDismissedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      if (DISMISSED_KEY) {
        try {
          localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(next)));
        } catch {
          // localStorage unavailable — set still updates in memory
        }
      }
      return next;
    });
  }, [DISMISSED_KEY]);

  // Keep state.actions in sync with recommendations, dropping anything the
  // user has already cleared client-side.
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      actions: recommendations
        .filter((r) => !dismissedIds.has(r.id))
        .map((r, i) => recToAction(r, i)),
      lastUpdate: new Date(),
    }));
  }, [recommendations, dismissedIds]);

  // VTID-01946 Phase H.4 — badge count + pulse delta tracking
  const [liveCount, setLiveCount] = useState<number>(0);
  const [hasNewRecommendations, setHasNewRecommendations] = useState<boolean>(false);
  const LAST_SEEN_KEY = user ? `vitana.autopilot.last_seen_count:${user.id}` : "";

  // Fetch badge count — returns the count + updates pulse state
  const fetchCount = useCallback(async (): Promise<number> => {
    if (!user || countInFlight) return liveCount;
    countInFlight = true;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${GATEWAY_URL}/autopilot/recommendations/count?role=community`, { headers });
      if (!res.ok) return liveCount;
      const json = await res.json();
      if (json.ok) {
        const newCount = Number(json.count) || 0;
        setLiveCount(newCount);
        console.log("[Autopilot] badge count:", newCount);
        // Pulse delta: compare with last-seen stored per-user
        try {
          const lastSeenRaw = localStorage.getItem(LAST_SEEN_KEY);
          const lastSeen = lastSeenRaw ? parseInt(lastSeenRaw, 10) : 0;
          setHasNewRecommendations(newCount > lastSeen);
        } catch {
          // localStorage may be unavailable (private mode) — silently skip pulse
        }
        return newCount;
      }
    } catch (e) {
      console.warn("[Autopilot] count fetch error:", e);
    } finally {
      countInFlight = false;
    }
    return liveCount;
  }, [user, liveCount, LAST_SEEN_KEY]);

  // VTID-01946 Phase H.4 — mark the current badge count as "seen" so
  // hasNewRecommendations becomes false until the next delta. Call this
  // when the Autopilot popup opens.
  const acknowledgePulse = useCallback(() => {
    try {
      if (LAST_SEEN_KEY) {
        localStorage.setItem(LAST_SEEN_KEY, String(liveCount));
      }
      setHasNewRecommendations(false);
    } catch {
      // localStorage unavailable — just clear the flag locally
      setHasNewRecommendations(false);
    }
  }, [liveCount, LAST_SEEN_KEY]);

  // Fetch full list — includes both new and activated items
  const fetchRecommendations = useCallback(async (): Promise<AutopilotRecommendation[]> => {
    if (!user) return [];
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${GATEWAY_URL}/autopilot/recommendations?status=new,activated&limit=20&role=community`, { headers });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const json = await res.json();
      if (json.ok) {
        const recs: AutopilotRecommendation[] = json.recommendations ?? [];
        setRecommendations(recs);
        // Self-prune the dismissed set against the latest server truth.
        // Anything the server no longer surfaces as new/activated (because
        // it's truly completed now, expired, or rejected) doesn't need to
        // sit in our client filter — otherwise an old dismissed id could
        // mask a freshly-issued recommendation that happens to reuse the
        // id, and the set just grows forever.
        const live = new Set(recs.map((r) => r.id));
        setDismissedIds((prev) => {
          if (prev.size === 0) return prev;
          let changed = false;
          const next = new Set<string>();
          prev.forEach((id) => {
            if (live.has(id)) {
              next.add(id);
            } else {
              changed = true;
            }
          });
          if (!changed) return prev;
          if (DISMISSED_KEY) {
            try {
              localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(next)));
            } catch {
              // localStorage unavailable — state still updates in memory
            }
          }
          return next;
        });
        console.log(`[Autopilot] fetched ${recs.length} recs, dismissed set size after prune: pending state update`);
        return recs;
      } else {
        throw new Error(json.error ?? "Unknown error");
      }
    } catch (e: any) {
      console.error("[Autopilot] fetch error:", e.message);
      setError(e.message || "Failed to load recommendations");
      return [];
    } finally {
      setLoading(false);
      setFetchedOnce(true);
    }
  }, [user, DISMISSED_KEY]);

  // VTID — on-demand regeneration. Asks the gateway for a fresh batch. The
  // backend already auto-regenerates on the last /complete or /reject (queue
  // hits 0), so this is the explicit "force refresh" path + what the empty
  // state calls. The backend is idempotent under a ~3-min cooldown, so a
  // double-tap is safe — it just comes back { generated: 0, reason: "cooldown" }.
  const generateRecommendations = useCallback(async (): Promise<AutopilotGenerateResult | null> => {
    if (!user) return null;
    setGenerating(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${GATEWAY_URL}/autopilot/recommendations/generate?role=community`, {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error(`Generate failed: ${res.status}`);
      const json = await res.json();
      if (json.ok) {
        const generated = Number(json.generated) || 0;
        if (generated > 0 && Array.isArray(json.recommendations)) {
          setRecommendations(json.recommendations as AutopilotRecommendation[]);
          setGenerateReason(null);
        } else {
          setGenerateReason((json.reason as AutopilotGenerateReason) ?? null);
        }
        return { ok: true, generated, reason: json.reason as AutopilotGenerateReason | undefined };
      }
      return null;
    } catch (e) {
      console.error("[Autopilot] generate error:", e);
      return null;
    } finally {
      setGenerating(false);
    }
  }, [user]);

  // Activate a single recommendation — returns full API response
  const activateRecommendation = useCallback(async (id: string): Promise<{
    ok: boolean;
    vtid?: string;
    action_type?: "navigate" | "notify";
    target?: string;
    completion_message?: string;
  } | null> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${GATEWAY_URL}/autopilot/recommendations/${id}/activate?role=community`, {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error(`Activate failed: ${res.status}`);
      const json = await res.json();
      if (json.ok) {
        return json;
      }
      return null;
    } catch (e) {
      console.error("[Autopilot] activate error:", e);
      return null;
    }
  }, []);

  // Complete — try the dedicated complete route first, then fall back to
  // reject for any non-2xx so the row always leaves the user's list. We
  // can't tell from this side whether the gateway revision ships /complete
  // at all, and an "executing"-forever row is much worse UX than losing a
  // possible reward. The /reject fallback intentionally drops ?role=
  // community because the proven-working dismissRecommendation path below
  // doesn't pass it.
  const completeRecommendation = useCallback(async (id: string): Promise<{
    ok: boolean;
    reward?: number;
    via?: "complete" | "reject";
    status?: number;
  } | null> => {
    const headers = await getAuthHeaders();
    const completeUrl = `${GATEWAY_URL}/autopilot/recommendations/${id}/complete?role=community`;
    let completeStatus: number | undefined;
    try {
      const res = await fetch(completeUrl, { method: "POST", headers });
      completeStatus = res.status;
      if (res.ok) {
        const json = await res.json().catch(() => ({ ok: true }));
        if (json.ok !== false) return { ...json, via: "complete", status: res.status };
      }
      const body = await res.text().catch(() => "");
      console.warn(`[Autopilot] complete ${res.status} for ${id} — falling back to reject`, body.slice(0, 300));
    } catch (e) {
      console.warn("[Autopilot] complete network error — falling back to reject", e);
    }
    try {
      const rejectRes = await fetch(`${GATEWAY_URL}/autopilot/recommendations/${id}/reject`, {
        method: "POST",
        headers,
      });
      if (rejectRes.ok) return { ok: true, via: "reject", status: completeStatus };
      const body = await rejectRes.text().catch(() => "");
      console.error(`[Autopilot] reject ${rejectRes.status} for ${id}`, body.slice(0, 300));
      return null;
    } catch (e) {
      console.error("[Autopilot] reject network error:", e);
      return null;
    }
  }, []);

  // Dismiss
  const dismissRecommendation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${GATEWAY_URL}/autopilot/recommendations/${id}/reject`, {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error(`Dismiss failed: ${res.status}`);
      const json = await res.json();
      if (json.ok) {
        setRecommendations((prev) => prev.filter((r) => r.id !== id));
        return true;
      }
      return false;
    } catch (e) {
      console.error("[Autopilot] dismiss error:", e);
      return false;
    }
  }, []);

  // Fetch count on mount
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // VTID-01946 Phase H.4 — poll every 5 minutes while app is open so the
  // badge updates without user interaction. Clears on unmount.
  // Also refetch the full list (not just the count) when consent is granted,
  // so a batch generated server-side — e.g. by the auto-regeneration that
  // fires when the queue empties — surfaces in the My Journey card without
  // needing a remount.
  useEffect(() => {
    if (!user) return;
    const POLL_MS = 5 * 60 * 1000;
    const id = setInterval(() => {
      fetchCount();
      if (hasConsent) fetchRecommendations();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [user, hasConsent, fetchCount, fetchRecommendations]);

  // ── Legacy compatibility ──

  const pendingActions = state.actions.filter((a) => a.status === "pending");
  const executingActions = state.actions.filter((a) => a.status === "executing");
  const allVisibleActions = state.actions.filter((a) => a.status === "pending" || a.status === "executing" || a.status === "completed");
  const pendingCount = pendingActions.length;
  const selectedActions = pendingActions.filter((a) => a.selected);

  const toggleActionSelection = (actionId: string) => {
    setState((prev) => ({
      ...prev,
      actions: prev.actions.map((a) =>
        a.id === actionId && a.status === "pending" ? { ...a, selected: !a.selected } : a
      ),
    }));
  };

  // Mark a single action's local status
  const setActionStatus = useCallback((actionId: string, status: AutopilotActionStatus) => {
    setState((prev) => ({
      ...prev,
      actions: prev.actions.map((a) =>
        a.id === actionId ? { ...a, status } : a
      ),
    }));
  }, []);

  // Execute selected actions — community activation is instant
  const executeActions = async (actionIds: string[]): Promise<ExecutionResult[]> => {
    setState((prev) => ({ ...prev, isExecuting: true }));
    const results: ExecutionResult[] = [];

    for (const id of actionIds) {
      const response = await activateRecommendation(id);
      const success = !!response;
      if (success) {
        // "notify" actions have nothing the user needs to do beyond reading the
        // completion message — flush them straight to completed on the backend
        // so they don't come back as "executing" on the next popup open. For
        // "navigate" actions we let the destination page (or the per-item
        // Complete button) own the final transition.
        if (response.action_type === "notify") {
          await completeRecommendation(id);
        }
        setActionStatus(id, "completed");
        results.push({
          actionId: id,
          success: true,
          message: response.completion_message || `VTID: ${response.vtid}`,
          action_type: response.action_type,
          target: response.target,
          completion_message: response.completion_message,
        });
      } else {
        setActionStatus(id, "failed");
        results.push({ actionId: id, success: false, message: "Failed" });
      }
    }

    // Refresh badge count after all done
    await fetchCount();

    setState((prev) => ({ ...prev, isExecuting: false }));
    return results;
  };

  const dismissActions = (actionIds: string[]) => {
    actionIds.forEach((id) => dismissRecommendation(id));
  };

  const getLatestActions = (count = 2) => pendingActions.slice(0, count);

  return {
    state,
    recommendations,
    pendingActions,
    executingActions,
    allVisibleActions,
    pendingCount,
    selectedActions,
    executeActions,
    toggleActionSelection,
    setActionStatus,
    dismissActions,
    getLatestActions,
    isExecuting: state.isExecuting,
    loading,
    error,
    fetchRecommendations,
    activateRecommendation,
    completeRecommendation,
    dismissRecommendation,
    markDismissedLocally,
    fetchCount,
    // VTID — on-demand regeneration
    generateRecommendations,
    generating,
    generateReason,
    fetchedOnce,
    // VTID-01946 Phase H.4 — live badge + pulse
    liveCount,
    hasNewRecommendations,
    acknowledgePulse,
  };
}
