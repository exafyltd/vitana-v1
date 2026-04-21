import { useState, useEffect, useCallback } from "react";
import { AutopilotAction, AutopilotState, AutopilotPriority, AutopilotCategory, ExecutionResult, AutopilotActionStatus } from "@/types/autopilot";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useUserPreferences } from "@/hooks/useUserPreferences";

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
  };
}

// Dedup guard for fetchCount
let countInFlight = false;

export function useAutopilot() {
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
  const { preferences } = useUserPreferences();

  const [recommendations, setRecommendations] = useState<AutopilotRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<AutopilotState>({
    actions: [],
    isExecuting: false,
    lastUpdate: new Date(),
  });

  // Keep state.actions in sync with recommendations
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      actions: recommendations.map((r, i) => recToAction(r, i)),
      lastUpdate: new Date(),
    }));
  }, [recommendations]);

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
  const fetchRecommendations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${GATEWAY_URL}/autopilot/recommendations?status=new,activated&limit=20&role=community`, { headers });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const json = await res.json();
      if (json.ok) {
        setRecommendations(json.recommendations ?? []);
      } else {
        throw new Error(json.error ?? "Unknown error");
      }
    } catch (e: any) {
      console.error("[Autopilot] fetch error:", e.message);
      setError(e.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
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
  useEffect(() => {
    if (!user) return;
    const POLL_MS = 5 * 60 * 1000;
    const id = setInterval(() => {
      fetchCount();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [user, fetchCount]);

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
    dismissRecommendation,
    fetchCount,
    // VTID-01946 Phase H.4 — live badge + pulse
    liveCount,
    hasNewRecommendations,
    acknowledgePulse,
  };
}
