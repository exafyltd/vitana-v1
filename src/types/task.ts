/**
 * Task Type Definitions - Backend Gateway API Spec
 */

export type TaskStatus = "active" | "in_progress" | "pending" | "scheduled" | "blocked" | "cancelled";
export type TaskPriority = "high" | "medium" | "low";
export type TaskLayer = "CICDL" | "AICOR" | "AGENT" | "GATEWAY" | "OASIS" | "UNKNOWN";
export type TaskInitiator = "manual" | "autopilot" | "operator" | "orb" | "system";

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

  // Creator tracking
  created_by?: string; // User ID of who created the task
  created_by_name?: string; // Display name of the creator
  created_by_email?: string; // Email of the creator
  initiated_via?: TaskInitiator; // How the task was initiated

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
  created_by?: string;
  created_by_name?: string;
  created_by_email?: string;
  initiated_via?: TaskInitiator;
}

export interface UpdateTaskPayload {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  outcome?: string;
  owner?: string;
}

export type ConnectionState = "LIVE" | "RECONNECTING" | "OFFLINE";
