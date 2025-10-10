import { useState, useEffect } from "react";
import { AutopilotAction, AutopilotState, AutopilotPriority, ExecutionResult, AutopilotActionStatus } from "@/types/autopilot";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useUserPreferences } from "@/hooks/useUserPreferences";

// Mock data generator with enhanced motivational actions
const generateMockActions = (): AutopilotAction[] => [
  {
    id: "1",
    title: "Join Longevity Dance Group Tonight?",
    reason: "Perfect match for your movement goals + social wellness vibes",
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
    title: "AI Breakthrough Insight Just Dropped",
    reason: "Your digital twin discovered something fascinating from your patterns",
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
    title: "Hydration Streak at 5 Days — Legend Status Awaits",
    reason: "One more sip closer to your weekly hydration mastery",
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
    title: "Auto-invite Squad to Epic Weekend Meetup",
    reason: "Sarah, Luna & Marcus are perfect longevity tribe matches",
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
    title: "Your Biomarker Story Awaits",
    reason: "Dr. Chen decoded exciting insights from your latest panel",
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
    title: "Mindful Morning Magic",
    reason: "Your soul is calling for these stress-melting techniques",
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
  const { logActivity } = useActivityLogger();
  const { preferences } = useUserPreferences();
  const [state, setState] = useState<AutopilotState>({
    actions: generateMockActions(),
    isExecuting: false,
    lastUpdate: new Date()
  });

  // Filter actions based on user preferences
  const filterActionsByPreferences = (actions: AutopilotAction[]) => {
    if (!preferences?.autopilot_enabled) return [];
    
    let filtered = actions.filter(action => action.status === "pending");
    
    // Filter by enabled categories
    if (preferences.autopilot_categories) {
      filtered = filtered.filter(action => {
        const categoryKey = action.category as keyof typeof preferences.autopilot_categories;
        return preferences.autopilot_categories[categoryKey] ?? true;
      });
    }
    
    // Filter by priority
    if (preferences.autopilot_priority_filter === 'high') {
      filtered = filtered.filter(action => action.priority === 'high');
    } else if (preferences.autopilot_priority_filter === 'high_medium') {
      filtered = filtered.filter(action => action.priority === 'high' || action.priority === 'medium');
    }
    
    // Respect max actions per day
    const maxActions = preferences.autopilot_max_actions_per_day || 5;
    filtered = filtered.slice(0, maxActions);
    
    return filtered;
  };

  const pendingActions = filterActionsByPreferences(state.actions);
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

        // Log execution activity for each action
        results.forEach((result) => {
          const action = state.actions.find(a => a.id === result.actionId);
          if (action) {
            logActivity({
              activityType: 'autopilot.action.execute',
              activityData: {
                title: action.title,
                category: action.category,
                success: result.success,
                priority: action.priority
              },
              contextData: {
                action_id: action.id
              }
            });
          }
        });

        resolve(results);
      }, 2000); // 2 second execution time
    });
  };

  const toggleActionSelection = (actionId: string) => {
    const action = state.actions.find(a => a.id === actionId);
    const willBeSelected = action ? !action.selected : false;
    
    setState(prev => ({
      ...prev,
      actions: prev.actions.map(action =>
        action.id === actionId 
          ? { ...action, selected: !action.selected }
          : action
      )
    }));

    // Log selection activity
    if (action && willBeSelected) {
      logActivity({
        activityType: 'autopilot.action.select',
        activityData: {
          title: action.title,
          category: action.category,
          priority: action.priority
        },
        contextData: {
          action_id: actionId
        }
      });
    }
  };

  const dismissActions = (actionIds: string[]) => {
    // Log dismiss activity for each action
    actionIds.forEach(actionId => {
      const action = state.actions.find(a => a.id === actionId);
      if (action) {
        logActivity({
          activityType: 'autopilot.action.dismiss',
          activityData: {
            title: action.title,
            category: action.category,
            priority: action.priority
          },
          contextData: {
            action_id: actionId
          }
        });
      }
    });

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