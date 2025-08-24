import { useState, useEffect } from "react";
import { AutopilotAction, AutopilotState, AutopilotPriority, ExecutionResult, AutopilotActionStatus } from "@/types/autopilot";

// Mock data generator for demonstration
const generateMockActions = (): AutopilotAction[] => [
  {
    id: "1",
    title: "Schedule 20-min morning walk",
    reason: "Your step count is 15% below target this week",
    category: "health",
    priority: "high",
    timeEstimate: "2 min",
    icon: "👟",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    status: "pending",
    selected: true
  },
  {
    id: "2", 
    title: "Join Sarah's yoga group invite",
    reason: "Matches your wellness goals + social connection need",
    category: "community",
    priority: "medium",
    timeEstimate: "1 min",
    icon: "🧘",
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
    status: "pending",
    selected: true
  },
  {
    id: "3",
    title: "Save podcast: 'Stress & Recovery'",
    reason: "Aligns with your recent sleep pattern questions",
    category: "media", 
    priority: "low",
    timeEstimate: "30 sec",
    icon: "🎧",
    timestamp: new Date(Date.now() - 12 * 60 * 1000),
    status: "pending",
    selected: true
  },
  {
    id: "4",
    title: "Book follow-up with Dr. Chen",
    reason: "Lab results are ready + optimal scheduling window",
    category: "health",
    priority: "high", 
    timeEstimate: "3 min",
    icon: "🩺",
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    status: "pending",
    selected: true
  },
  {
    id: "5",
    title: "Add meditation app to phone",
    reason: "Stress levels elevated, meditation helps 73% of users",
    category: "discover",
    priority: "medium",
    timeEstimate: "2 min", 
    icon: "🧠",
    timestamp: new Date(Date.now() - 18 * 60 * 1000),
    status: "pending",
    selected: false
  },
  {
    id: "6",
    title: "Block calendar: Deep work 2-4 PM",
    reason: "Your energy peaks match this window historically",
    category: "calendar",
    priority: "medium",
    timeEstimate: "1 min",
    icon: "📅",
    timestamp: new Date(Date.now() - 22 * 60 * 1000),
    status: "pending", 
    selected: true
  }
];

export function useAutopilot() {
  const [state, setState] = useState<AutopilotState>({
    actions: generateMockActions(),
    isExecuting: false,
    lastUpdate: new Date()
  });

  const pendingActions = state.actions.filter(action => action.status === "pending");
  const pendingCount = pendingActions.length;
  const selectedActions = pendingActions.filter(action => action.selected);

  // Mock real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate new actions arriving
      if (Math.random() < 0.1) { // 10% chance every 5 seconds
        const newAction: AutopilotAction = {
          id: Date.now().toString(),
          title: "New AI suggestion",
          reason: "Based on recent activity patterns",
          category: Math.random() > 0.5 ? "health" : "community",
          priority: "medium" as AutopilotPriority,
          timeEstimate: "1-2 min",
          icon: "✨",
          timestamp: new Date(),
          status: "pending",
          selected: true
        };

        setState(prev => ({
          ...prev,
          actions: [newAction, ...prev.actions],
          lastUpdate: new Date()
        }));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const executeActions = async (actionIds: string[]): Promise<ExecutionResult[]> => {
    setState(prev => ({ ...prev, isExecuting: true }));

    // Simulate execution with realistic timing
    return new Promise((resolve) => {
      setTimeout(() => {
        const results: ExecutionResult[] = actionIds.map(id => ({
          actionId: id,
          success: Math.random() > 0.1, // 90% success rate
          message: Math.random() > 0.1 ? "Completed successfully" : "Failed - will retry later"
        }));

        setState(prev => ({
          ...prev,
          isExecuting: false,
          actions: prev.actions.map(action => 
            actionIds.includes(action.id)
              ? { 
                  ...action, 
                  status: results.find(r => r.actionId === action.id)?.success ? "completed" : "failed" as AutopilotActionStatus 
                }
              : action
          ),
          lastUpdate: new Date()
        }));

        resolve(results);
      }, 2000); // 2 second execution time
    });
  };

  const toggleActionSelection = (actionId: string) => {
    setState(prev => ({
      ...prev,
      actions: prev.actions.map(action =>
        action.id === actionId 
          ? { ...action, selected: !action.selected }
          : action
      )
    }));
  };

  const dismissActions = (actionIds: string[]) => {
    setState(prev => ({
      ...prev,
      actions: prev.actions.map(action =>
        actionIds.includes(action.id)
          ? { ...action, status: "skipped" as AutopilotActionStatus }
          : action
      )
    }));
  };

  const getLatestActions = (count: number = 2) => {
    return pendingActions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count);
  };

  return {
    state,
    pendingActions,
    pendingCount,
    selectedActions,
    executeActions,
    toggleActionSelection, 
    dismissActions,
    getLatestActions,
    isExecuting: state.isExecuting
  };
}