/**
 * Command Hub Type Definitions
 */

// Legacy types (kept for compatibility)
export interface VTIDMetadata {
  id: string;
  label: string;
  tenant?: string;
  created_at?: string;
  status?: 'active' | 'completed' | 'failed';
}

export interface ActiveVTIDContext {
  activeVTID: VTIDMetadata | null;
  setActiveVTID: (vtid: VTIDMetadata | null) => void;
  clearVTID: () => void;
}

export interface CommandMessage {
  id: string;
  type: 'user' | 'system' | 'assistant';
  content: string;
  timestamp: Date;
  vtid?: string;
  actions?: CommandAction[];
}

export interface CommandAction {
  id: string;
  label: string;
  type: 'approve' | 'deny' | 'cancel' | 'retry';
  onClick: () => void;
}

export interface SplitFocusState {
  focusedPane: 'left' | 'right';
  setFocus: (pane: 'left' | 'right') => void;
  hasUnreadLeft: boolean;
  hasUnreadRight: boolean;
  markRead: (pane: 'left' | 'right') => void;
}

export interface TickerEvent {
  ts: string;
  vtid: string;
  layer: string;
  module: string;
  source: "oasis.events" | "github.actions" | "gcp.deploy" | "agent.ping";
  kind: "workflow_run" | "event" | "deploy" | "ping";
  status: "queued" | "in_progress" | "success" | "failure" | "info";
  title: string;
  ref?: string;
  link?: string;
}

export type TickerConnectionState = "LIVE" | "OFFLINE";
export type TickerScope = "ALL" | string;

// New real-time Command Hub types
export type Status = "info" | "success" | "warn" | "error";
export type Layer = "CICDL" | "AICOR" | "AGENT" | "GATEWAY" | "OASIS" | "UNKNOWN";

export interface Link {
  label: string;
  href: string;
}

export interface Event {
  id: string;
  ts: string; // ISO timestamp
  vtid?: string;
  layer: Layer;
  module?: string;
  kind: string; // e.g., "chat.message.out", "task.created"
  status: Status;
  title: string;
  data?: Record<string, any>;
  links?: Link[];
}

export interface ChatThread {
  vtid: string;
  items: ChatItem[];
}

export interface ChatItem {
  role: "user" | "operator";
  ts: string;
  text: string;
  links?: Link[];
  meta?: Record<string, any>;
}

export interface Filters {
  q?: string;
  layer?: Layer | "ALL";
  status?: Status | "ALL";
  module?: string | "ALL";
  vtid?: string;
}
