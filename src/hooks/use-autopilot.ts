import { useState, useEffect, useMemo } from "react";
import { AutopilotAction, AutopilotState, AutopilotPriority, AutopilotCategory, ExecutionResult, AutopilotActionStatus } from "@/types/autopilot";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useTranslation } from "@/hooks/useTranslation";

// Action IDs map to translation keys
interface ActionConfig {
  id: string;
  titleKey: string;
  reasonKey: string;
  category: AutopilotCategory;
  priority: AutopilotPriority;
  timeEstimate: string;
  icon: string;
  imageUrl: string;
  actionType?: string;
  ctaLabel?: string;
}

const actionConfigs: ActionConfig[] = [
  { id: "1", titleKey: "action1Title", reasonKey: "action1Reason", category: "community", priority: "high", timeEstimate: "2 min", icon: "💃", imageUrl: "/src/assets/actions/community-dance-group.jpg", actionType: "join" },
  { id: "2", titleKey: "action2Title", reasonKey: "action2Reason", category: "discover", priority: "medium", timeEstimate: "1-2 min", icon: "✨", imageUrl: "/src/assets/actions/ai-neural-patterns.jpg", ctaLabel: "View Insight" },
  { id: "3", titleKey: "action3Title", reasonKey: "action3Reason", category: "health", priority: "medium", timeEstimate: "30 sec", icon: "💧", imageUrl: "/src/assets/actions/hydration-water-bottle.jpg", ctaLabel: "Log It" },
  { id: "4", titleKey: "action4Title", reasonKey: "action4Reason", category: "community", priority: "high", timeEstimate: "1 min", icon: "🎉", imageUrl: "/src/assets/actions/friends-meetup-selfie.jpg", ctaLabel: "Send Invites" },
  { id: "5", titleKey: "action5Title", reasonKey: "action5Reason", category: "health", priority: "high", timeEstimate: "3 min", icon: "🩺", imageUrl: "/src/assets/actions/doctor-biomarker-review.jpg", actionType: "review" },
  { id: "6", titleKey: "action6Title", reasonKey: "action6Reason", category: "media", priority: "low", timeEstimate: "30 sec", icon: "🧘", imageUrl: "/src/assets/actions/wellness-yoga-nature.jpg", actionType: "watch" },
];

export function useAutopilot() {
  const { logActivity } = useActivityLogger();
  const { preferences } = useUserPreferences();
  const { translate } = useTranslation();

  // Generate mock actions with translations
  const generateMockActions = useMemo((): AutopilotAction[] => {
    const now = Date.now();
    return actionConfigs.map((config, index) => ({
      id: config.id,
      title: translate(`autopilot.actions.${config.titleKey}`),
      reason: translate(`autopilot.actions.${config.reasonKey}`),
      category: config.category,
      priority: config.priority,
      timeEstimate: config.timeEstimate,
      icon: config.icon,
      imageUrl: config.imageUrl,
      timestamp: new Date(now - (5 + index * 4) * 60 * 1000),
      status: "pending" as AutopilotActionStatus,
      selected: index < 4, // First 4 selected by default
      actionType: config.actionType,
      ctaLabel: config.ctaLabel,
    }));
  }, [translate]);

  const [state, setState] = useState<AutopilotState>({
    actions: generateMockActions,
    isExecuting: false,
    lastUpdate: new Date()
  });

  // Update actions when language changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      actions: generateMockActions,
      lastUpdate: new Date()
    }));
  }, [generateMockActions]);

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
          title: translate('autopilot.actions.newActionTitle'),
          reason: translate('autopilot.actions.newActionReason'),
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
  }, [translate]);

  const executeActions = async (actionIds: string[]): Promise<ExecutionResult[]> => {
    setState(prev => ({ ...prev, isExecuting: true }));

    // Simulate execution with realistic timing
    return new Promise((resolve) => {
      setTimeout(() => {
        const results: ExecutionResult[] = actionIds.map(id => ({
          actionId: id,
          success: Math.random() > 0.1, // 90% success rate
          message: Math.random() > 0.1 ? translate('autopilot.success') : translate('autopilot.failed')
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
