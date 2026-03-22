import { useState, useEffect, useCallback } from "react";
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

interface UseAutopilotReturn {
  recommendations: AutopilotRecommendation[];
  pendingCount: number;
  loading: boolean;
  error: string | null;
  isExecuting: boolean;
  fetchRecommendations: () => Promise<void>;
  activateRecommendation: (id: string) => Promise<string | null>;
  dismissRecommendation: (id: string) => Promise<boolean>;
  // Legacy compat fields used by sidebar / chips
  pendingActions: AutopilotRecommendation[];
  selectedActions: AutopilotRecommendation[];
  executeActions: (ids: string[]) => Promise<{ actionId: string; success: boolean; message?: string }[]>;
  toggleActionSelection: (id: string) => void;
  dismissActions: (ids: string[]) => void;
  getLatestActions: (count?: number) => AutopilotRecommendation[];
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

export function useAutopilot(): UseAutopilotReturn {
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
  const { preferences } = useUserPreferences();

  const [recommendations, setRecommendations] = useState<AutopilotRecommendation[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch badge count
  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/autopilot/recommendations/count`, { headers });
      if (!res.ok) throw new Error(`Count fetch failed: ${res.status}`);
      const json = await res.json();
      if (json.ok) setPendingCount(json.count ?? 0);
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
        const recs: AutopilotRecommendation[] = json.recommendations ?? [];
        setRecommendations(recs);
        setPendingCount(json.count ?? recs.length);
        // Auto-select all by default
        setSelectedIds(new Set(recs.map((r) => r.id)));
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
        setPendingCount((prev) => Math.max(0, prev - 1));
        setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
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
        setPendingCount((prev) => Math.max(0, prev - 1));
        setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
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

  // ── Legacy compatibility layer ──
  const pendingActions = recommendations;
  const selectedActions = recommendations.filter((r) => selectedIds.has(r.id));

  const toggleActionSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const executeActions = async (ids: string[]) => {
    setIsExecuting(true);
    const results: { actionId: string; success: boolean; message?: string }[] = [];
    for (const id of ids) {
      const vtid = await activateRecommendation(id);
      results.push({ actionId: id, success: !!vtid, message: vtid ? `VTID: ${vtid}` : "Failed" });
    }
    setIsExecuting(false);
    return results;
  };

  const dismissActions = (ids: string[]) => {
    ids.forEach((id) => dismissRecommendation(id));
  };

  const getLatestActions = (count = 2) => recommendations.slice(0, count);

  return {
    recommendations,
    pendingCount,
    loading,
    error,
    isExecuting,
    fetchRecommendations,
    activateRecommendation,
    dismissRecommendation,
    pendingActions,
    selectedActions,
    executeActions,
    toggleActionSelection,
    dismissActions,
    getLatestActions,
  };
}
