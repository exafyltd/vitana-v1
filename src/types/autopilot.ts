export type AutopilotCategory = 
  | "health" 
  | "community" 
  | "media" 
  | "discover" 
  | "calendar";

export type AutopilotPriority = "high" | "medium" | "low";

export type AutopilotActionStatus = "pending" | "executing" | "completed" | "skipped" | "failed";

export interface AutopilotAction {
  id: string;
  title: string;
  reason: string;
  category: AutopilotCategory;
  priority: AutopilotPriority;
  timeEstimate?: string;
  icon: string;
  timestamp: Date;
  status: AutopilotActionStatus;
  selected?: boolean;
}

export interface AutopilotState {
  actions: AutopilotAction[];
  isExecuting: boolean;
  lastUpdate: Date;
}

export interface ExecutionResult {
  actionId: string;
  success: boolean;
  message?: string;
}