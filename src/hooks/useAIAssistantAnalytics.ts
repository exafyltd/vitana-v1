import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AIAssistantMetrics {
  total_conversations: number;
  active_conversations_7d: number;
  total_patterns_discovered: number;
  patterns_implemented: number;
  total_automations: number;
  automations_success_rate: number;
  total_situation_analyses: number;
  avg_analysis_duration_ms: number;
}

interface TimeSeriesData {
  date: string;
  conversations: number;
  patterns: number;
  automations: number;
}

export function useAIAssistantAnalytics() {
  const [metrics, setMetrics] = useState<AIAssistantMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch conversations metrics
      const { count: totalConversations } = await supabase
        .from("ai_conversations")
        .select("*", { count: "exact", head: true });

      const { count: activeConversations7d } = await supabase
        .from("ai_conversations")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Fetch pattern discovery metrics
      const { count: totalPatterns } = await supabase
        .from("pattern_discoveries")
        .select("*", { count: "exact", head: true });

      const { count: patternsImplemented } = await supabase
        .from("pattern_discoveries")
        .select("*", { count: "exact", head: true })
        .eq("status", "implemented");

      // Fetch automation metrics
      const { count: totalAutomations } = await supabase
        .from("automation_executions")
        .select("*", { count: "exact", head: true });

      const { count: successfulAutomations } = await supabase
        .from("automation_executions")
        .select("*", { count: "exact", head: true })
        .eq("status", "success");

      // Fetch situation analyses metrics
      const { count: totalAnalyses } = await supabase
        .from("ai_situation_analyses")
        .select("*", { count: "exact", head: true });

      const { data: analysesData } = await supabase
        .from("ai_situation_analyses")
        .select("analysis_duration_ms")
        .not("analysis_duration_ms", "is", null);

      const avgDuration = analysesData?.length
        ? analysesData.reduce((sum, a) => sum + (a.analysis_duration_ms || 0), 0) / analysesData.length
        : 0;

      // Fetch time series data (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: conversationsTimeSeries } = await supabase
        .from("ai_conversations")
        .select("created_at")
        .gte("created_at", sevenDaysAgo);

      const { data: patternsTimeSeries } = await supabase
        .from("pattern_discoveries")
        .select("created_at")
        .gte("created_at", sevenDaysAgo);

      const { data: automationsTimeSeries } = await supabase
        .from("automation_executions")
        .select("created_at")
        .gte("created_at", sevenDaysAgo);

      // Group by date
      const dateMap = new Map<string, TimeSeriesData>();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split("T")[0];
        dateMap.set(dateStr, {
          date: dateStr,
          conversations: 0,
          patterns: 0,
          automations: 0,
        });
      }

      conversationsTimeSeries?.forEach((item) => {
        const dateStr = item.created_at.split("T")[0];
        if (dateMap.has(dateStr)) {
          dateMap.get(dateStr)!.conversations++;
        }
      });

      patternsTimeSeries?.forEach((item) => {
        const dateStr = item.created_at.split("T")[0];
        if (dateMap.has(dateStr)) {
          dateMap.get(dateStr)!.patterns++;
        }
      });

      automationsTimeSeries?.forEach((item) => {
        const dateStr = item.created_at.split("T")[0];
        if (dateMap.has(dateStr)) {
          dateMap.get(dateStr)!.automations++;
        }
      });

      setMetrics({
        total_conversations: totalConversations || 0,
        active_conversations_7d: activeConversations7d || 0,
        total_patterns_discovered: totalPatterns || 0,
        patterns_implemented: patternsImplemented || 0,
        total_automations: totalAutomations || 0,
        automations_success_rate:
          totalAutomations && successfulAutomations
            ? Math.round((successfulAutomations / totalAutomations) * 100)
            : 0,
        total_situation_analyses: totalAnalyses || 0,
        avg_analysis_duration_ms: Math.round(avgDuration),
      });

      setTimeSeriesData(Array.from(dateMap.values()));
    } catch (err: any) {
      console.error("Error fetching AI assistant analytics:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    metrics,
    timeSeriesData,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}
