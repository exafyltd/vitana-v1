/**
 * Command Hub Type Definitions
 */

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
