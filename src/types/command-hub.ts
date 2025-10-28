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
