import { CheckCircle, Clock, Edit, Trash2, Maximize2, Pin, Share2, Sparkles, TrendingUp, EyeOff, Calendar, FileText, MessageSquare, Eye } from 'lucide-react';
import React from 'react';

export interface CTAConfig {
  primary: {
    label: string;
    icon: React.ReactNode;
    variant: 'default' | 'outline' | 'ghost';
    requiresConsent?: boolean;
  };
  secondary: Array<{
    label: string;
    icon: React.ReactNode;
    action: string;
    requiresConsent?: boolean;
  }>;
}

export function getCtaForScreen(screenId: string, itemType?: string): CTAConfig {
  const taxonomy: Record<string, CTAConfig> = {
    // Reminder (D1-004-01)
    'D1-004-01': {
      primary: { label: 'Mark Done', icon: React.createElement(CheckCircle), variant: 'default' },
      secondary: [
        { label: 'Snooze', icon: React.createElement(Clock), action: 'snooze' },
        { label: 'Edit', icon: React.createElement(Edit), action: 'edit' },
        { label: 'Delete', icon: React.createElement(Trash2), action: 'delete' },
      ]
    },
    
    // Memory Timeline (D1-008-01)
    'D1-008-01': {
      primary: { label: 'Open', icon: React.createElement(Maximize2), variant: 'outline' },
      secondary: [
        { label: 'Pin', icon: React.createElement(Pin), action: 'pin' },
        { label: 'Share', icon: React.createElement(Share2), action: 'share' },
        { label: 'Delete', icon: React.createElement(Trash2), action: 'delete' },
      ]
    },
    
    // AI Feed (D1-001-04)
    'D1-001-04': {
      primary: { label: 'Save to Memory', icon: React.createElement(Sparkles), variant: 'default' },
      secondary: [
        { label: 'Improve', icon: React.createElement(TrendingUp), action: 'improve' },
        { label: 'Hide', icon: React.createElement(EyeOff), action: 'hide' },
      ]
    },
    
    // Sharing Packages (D1-007-02)
    'D1-007-02': {
      primary: { label: 'Schedule', icon: React.createElement(Calendar), variant: 'default' },
      secondary: [
        { label: 'Edit', icon: React.createElement(Edit), action: 'edit' },
        { label: 'Remove', icon: React.createElement(Trash2), action: 'remove' },
      ]
    },
    
    // Health Biology (D1-005-02) - REQUIRES CONSENT
    'D1-005-02': {
      primary: { 
        label: 'View Panel', 
        icon: React.createElement(FileText), 
        variant: 'default',
        requiresConsent: false
      },
      secondary: [
        { 
          label: 'Share with Provider', 
          icon: React.createElement(Share2), 
          action: 'share_provider',
          requiresConsent: true
        },
        { 
          label: 'Add Note', 
          icon: React.createElement(MessageSquare), 
          action: 'add_note',
          requiresConsent: false
        }
      ]
    },
  };
  
  return taxonomy[screenId] || {
    primary: { label: 'View', icon: React.createElement(Eye), variant: 'outline' },
    secondary: []
  };
}
