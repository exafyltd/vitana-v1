import { useState, useCallback } from "react";
import { AutopilotAction, AutopilotActionStatus, ExecutionResult } from "@/types/autopilot";
import { toast } from "sonner";

/**
 * Generate contextual dev actions
 */
const generateDevActions = (): AutopilotAction[] => {
    const now = new Date();
    return [
      {
        id: "dev-1",
        title: "Review Failed VTID DEV-CICDL-0042",
        reason: "Database connection timeout detected 3 min ago",
        category: "health",
        priority: "high",
        timeEstimate: "2-3 min",
        icon: "🔴",
        timestamp: new Date(now.getTime() - 3 * 60000),
        status: "pending" as AutopilotActionStatus,
        selected: true,
      },
      {
        id: "dev-2",
        title: "Investigate Memory Spike in Gateway",
        reason: "CPU usage reached 87% on vitana-gateway pod",
        category: "health",
        priority: "high",
        timeEstimate: "3-5 min",
        icon: "⚠️",
        timestamp: new Date(now.getTime() - 8 * 60000),
        status: "pending" as AutopilotActionStatus,
        selected: true,
      },
      {
        id: "dev-3",
        title: "Approve Pending Deployment Pipeline",
        reason: "Staging environment ready for promotion",
        category: "discover",
        priority: "medium",
        timeEstimate: "1-2 min",
        icon: "🚀",
        timestamp: new Date(now.getTime() - 15 * 60000),
        status: "pending" as AutopilotActionStatus,
        selected: true,
      },
      {
        id: "dev-4",
        title: "Analyze Event Correlation Pattern",
        reason: "15 related events detected across 3 VTIDs",
        category: "community",
        priority: "medium",
        timeEstimate: "4-5 min",
        icon: "📊",
        timestamp: new Date(now.getTime() - 20 * 60000),
        status: "pending" as AutopilotActionStatus,
        selected: true,
      },
      {
        id: "dev-5",
        title: "Update Dev Environment Variables",
        reason: "3 new secrets need configuration",
        category: "discover",
        priority: "medium",
        timeEstimate: "2-3 min",
        icon: "⚙️",
        timestamp: new Date(now.getTime() - 25 * 60000),
        status: "pending" as AutopilotActionStatus,
        selected: true,
      },
      {
        id: "dev-6",
        title: "Review API Rate Limit Trends",
        reason: "Unusual traffic pattern on /oasis endpoint",
        category: "media",
        priority: "low",
        timeEstimate: "3-4 min",
        icon: "📈",
        timestamp: new Date(now.getTime() - 35 * 60000),
        status: "pending" as AutopilotActionStatus,
        selected: false,
      },
      {
        id: "dev-7",
        title: "Clean Up Old Debug Logs",
        reason: "8 GB of logs older than 7 days",
        category: "health",
        priority: "low",
        timeEstimate: "5-7 min",
        icon: "🧹",
        timestamp: new Date(now.getTime() - 45 * 60000),
        status: "pending" as AutopilotActionStatus,
        selected: false,
      },
      {
        id: "dev-8",
        title: "Optimize Database Indexes",
        reason: "Query performance can be improved by 23%",
        category: "health",
        priority: "low",
        timeEstimate: "6-8 min",
        icon: "🔧",
        timestamp: new Date(now.getTime() - 60 * 60000),
        status: "pending" as AutopilotActionStatus,
        selected: false,
      },
    ];
};

/**
 * Dev Hub Autopilot Hook
 * Generates contextual actions for VITANA Dev operations
 */
export function useDevAutopilot() {
  const [actions, setActions] = useState<AutopilotAction[]>(generateDevActions());
  const [isExecuting, setIsExecuting] = useState(false);

  const pendingActions = actions.filter((a) => a.status === "pending");
  const selectedActions = pendingActions.filter((a) => a.selected);
  const pendingCount = pendingActions.length;

  const toggleActionSelection = useCallback((actionId: string) => {
    setActions((prev) =>
      prev.map((action) =>
        action.id === actionId ? { ...action, selected: !action.selected } : action
      )
    );
  }, []);

  const selectAllActions = useCallback(() => {
    setActions((prev) =>
      prev.map((action) =>
        action.status === "pending" ? { ...action, selected: true } : action
      )
    );
  }, []);

  const deselectAllActions = useCallback(() => {
    setActions((prev) =>
      prev.map((action) =>
        action.status === "pending" ? { ...action, selected: false } : action
      )
    );
  }, []);

  const dismissActions = useCallback((actionIds: string[]) => {
    setActions((prev) =>
      prev.map((action) =>
        actionIds.includes(action.id) ? { ...action, status: "skipped" as AutopilotActionStatus } : action
      )
    );
    toast.success(`Dismissed ${actionIds.length} action${actionIds.length !== 1 ? 's' : ''}`);
  }, []);

  const executeActions = useCallback(async (actionIds: string[]): Promise<ExecutionResult[]> => {
    const toExecute = actions.filter((a) => actionIds.includes(a.id) && a.status === "pending");
    if (toExecute.length === 0) return [];

    setIsExecuting(true);

    // Simulate execution with dev-specific actions
    const results: ExecutionResult[] = [];
    for (const action of toExecute) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      setActions((prev) =>
        prev.map((a) =>
          a.id === action.id ? { ...a, status: "completed" as AutopilotActionStatus } : a
        )
      );

      results.push({
        actionId: action.id,
        success: true,
        message: `Completed: ${action.title}`,
      });
    }

    setIsExecuting(false);
    toast.success(`Executed ${toExecute.length} dev action${toExecute.length !== 1 ? 's' : ''} successfully`);
    
    return results;
  }, [actions]);

  const getLatestActions = useCallback(
    (count: number = 2) => {
      return pendingActions
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, count);
    },
    [pendingActions]
  );

  return {
    pendingActions,
    selectedActions,
    pendingCount,
    isExecuting,
    toggleActionSelection,
    selectAllActions,
    deselectAllActions,
    dismissActions,
    executeActions,
    getLatestActions,
  };
}
