/**
 * Task Type Definitions - Backend Gateway API Spec
 */

export type TaskStatus = "active" | "in_progress" | "pending" | "scheduled" | "blocked" | "cancelled";
export type TaskPriority = "high" | "medium" | "low";
export type TaskLayer = "CICDL" | "AICOR" | "AGENT" | "GATEWAY" | "OASIS" | "UNKNOWN";

export interface Task {
  id: string;
  title: string;
  owner: string;
  layer: TaskLayer;
  module: string;
  status: TaskStatus;
  priority: TaskPriority;
  outcome?: string;
  created_at: string;
  updated_at: string;
  
  // UI-only fields
  isNew?: boolean; // For 5s glow animation
  confidence?: number; // AI-suggested tasks only
  reason?: string; // AI-suggested tasks only
}

export interface CreateTaskPayload {
  title: string;
  owner?: string;
  layer?: TaskLayer;
  module?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
}

export interface UpdateTaskPayload {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  outcome?: string;
  owner?: string;
}

export type ConnectionState = "LIVE" | "RECONNECTING" | "OFFLINE";
