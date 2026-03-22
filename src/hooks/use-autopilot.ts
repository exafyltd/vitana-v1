import { useState, useEffect, useCallback } from "react";
import { AutopilotAction, AutopilotState, AutopilotPriority, AutopilotCategory, ExecutionResult, AutopilotActionStatus } from "@/types/autopilot";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const GATEWAY_BASE = import.meta.env.VITE_GATEWAY_BASE || "https://gateway-q74ibpv6ia-uc.a.run.app";
const API_BASE = `${GATEWAY_BASE.replace(/\/+$/, "")}/api/v1`;

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
  return {
    id: rec.id,
    title: rec.title,
    reason: rec.summary,
    category: domainToCategory(rec.domain),
    priority: riskToPriority(rec.risk_level),
    timeEstimate: rec.estimated_duration || undefined,
    icon: domainToIcon(rec.domain),
    timestamp: new Date(),
    status: "pending" as AutopilotActionStatus,
    selected: true,
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

  // Fetch badge count
  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/autopilot/recommendations/count`, { headers });
      if (!res.ok) return;
      const json = await res.json();
      if (json.ok) {
        // Update actions array length info but don't overwrite actual data
        console.log("[Autopilot] badge count:", json.count);
      }
    } catch (e) {
      console.warn("[Autopilot] count fetch error:", e);
    }
  }, [user]);

  // Fetch full list
  const fetchRecommendations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/autopilot/recommendations?status=new&limit=20`, { headers });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const json = await res.json();
      if (json.ok) {
        setRecommendations(json.recommendations ?? []);
      } else {
        throw new Error(json.error ?? "Unknown error");
      }
    } catch (e: any) {
      console.error("[Autopilot] fetch error:", e);
      setError(e.message ?? "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Activate
  const activateRecommendation = useCallback(async (id: string): Promise<string | null> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/autopilot/recommendations/${id}/activate`, {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error(`Activate failed: ${res.status}`);
      const json = await res.json();
      if (json.ok) {
        setRecommendations((prev) => prev.filter((r) => r.id !== id));
        return json.vtid ?? null;
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
      const res = await fetch(`${API_BASE}/autopilot/recommendations/${id}/reject`, {
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

  // ── Legacy compatibility ──

  const pendingActions = state.actions.filter((a) => a.status === "pending");
  const pendingCount = pendingActions.length;
  const selectedActions = pendingActions.filter((a) => a.selected);

  const toggleActionSelection = (actionId: string) => {
    setState((prev) => ({
      ...prev,
      actions: prev.actions.map((a) =>
        a.id === actionId ? { ...a, selected: !a.selected } : a
      ),
    }));
  };

  const executeActions = async (actionIds: string[]): Promise<ExecutionResult[]> => {
    setState((prev) => ({ ...prev, isExecuting: true }));
    const results: ExecutionResult[] = [];
    for (const id of actionIds) {
      const vtid = await activateRecommendation(id);
      results.push({ actionId: id, success: !!vtid, message: vtid ? `VTID: ${vtid}` : "Failed" });
    }
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
    pendingCount,
    selectedActions,
    executeActions,
    toggleActionSelection,
    dismissActions,
    getLatestActions,
    isExecuting: state.isExecuting,
    loading,
    error,
    fetchRecommendations,
    activateRecommendation,
    dismissRecommendation,
  };
}
