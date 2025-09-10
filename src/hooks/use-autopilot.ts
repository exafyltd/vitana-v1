import { useState, useEffect } from "react";
import { AutopilotAction, AutopilotState, AutopilotPriority, ExecutionResult, AutopilotActionStatus } from "@/types/autopilot";

// Mock data generator with Maxina-flavored actions for demonstration
const generateMockActions = (): AutopilotAction[] => [
  {
    id: "1",
    title: "Join Longevity Dance Group Tonight?",
    reason: "Perfect match for your movement goals + social wellness",
    category: "community",
    priority: "high",
    timeEstimate: "2 min",
    icon: "💃",
    imageUrl: "/src/assets/actions/community-dance-group.jpg",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    status: "pending",
    selected: true
  },
  {
    id: "2", 
    title: "New AI Suggestion",
    reason: "Based on your recent activity patterns",
    category: "discover",
    priority: "medium",
    timeEstimate: "1-2 min",
    icon: "✨",
    imageUrl: "/src/assets/actions/ai-neural-patterns.jpg",
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
    status: "pending",
    selected: true
  },
  {
    id: "3",
    title: "Hydration Streak at 5 Days — Keep It Going?",
    reason: "One more day to reach your weekly goal",
    category: "health", 
    priority: "medium",
    timeEstimate: "30 sec",
    icon: "💧",
    imageUrl: "/src/assets/actions/hydration-water-bottle.jpg",
    timestamp: new Date(Date.now() - 12 * 60 * 1000),
    status: "pending",
    selected: true
  },
  {
    id: "4",
    title: "Auto-invite 3 Friends to This Weekend's Meetup",
    reason: "Sarah, Luna & Marcus match the longevity theme perfectly",
    category: "community",
    priority: "high", 
    timeEstimate: "1 min",
    icon: "🎉",
    imageUrl: "/src/assets/actions/friends-meetup-selfie.jpg",
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    status: "pending",
    selected: true
  },
  {
    id: "5",
    title: "Book Follow-Up: Biomarker Results Review",
    reason: "Dr. Chen has new insights from your latest panel",
    category: "health",
    priority: "high",
    timeEstimate: "3 min", 
    icon: "🩺",
    imageUrl: "/src/assets/actions/doctor-biomarker-review.jpg",
    timestamp: new Date(Date.now() - 18 * 60 * 1000),
    status: "pending",
    selected: false
  },
  {
    id: "6",
    title: "Morning Wellness Routine",
    reason: "Covers stress resilience techniques you've been exploring",
    category: "media",
    priority: "low",
    timeEstimate: "30 sec",
    icon: "🧘",
    imageUrl: "/src/assets/actions/wellness-yoga-nature.jpg",
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
          imageUrl: "/src/assets/actions/ai-neural-patterns.jpg",
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