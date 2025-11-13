import { ButtonProps } from '@/components/ui/button';

export type ActionId = 
  | 'join' 
  | 'connect' 
  | 'send_invite'
  | 'review' 
  | 'save_to_memory'
  | 'dismiss'
  | 'hide'
  | 'apply'
  | 'watch'
  | 'view_profile'
  | 'schedule'
  | 'open'
  | 'mark_done'
  | string; // fallback for custom actions

/**
 * Maps action identifiers to semantic button variants
 * Following Vitana's unified CTA design system
 */
export function getVariantForAction(
  actionId: ActionId | string
): ButtonProps['variant'] {
  const normalizedId = actionId.toLowerCase().replace(/\s+/g, '_');
  
  switch (normalizedId) {
    // PRIMARY: Join actions (Vitana-green gradient)
    case 'join':
    case 'join_group':
    case 'join_event':
    case 'join_now':
    case 'rsvp':
      return 'join';
    
    // SECONDARY: Connection actions (neutral, outline style)
    case 'connect':
    case 'send_invite':
    case 'send_invites':
    case 'follow':
    case 'add_friend':
      return 'secondary';
    
    // DEFAULT: Review/Action items (brand purple)
    case 'review':
    case 'save_to_memory':
    case 'save':
    case 'apply':
    case 'watch':
    case 'start':
    case 'book':
    case 'book_now':
    case 'schedule':
    case 'complete':
    case 'complete_action':
    case 'take_action':
    case 'log_it':
    case 'view_insight':
    case 'view_details':
    case 'auto-share':
      return 'default';
    
    // GHOST: Dismissive actions (subtle, text-only style)
    case 'dismiss':
    case 'hide':
    case 'skip':
    case 'not_interested':
    case 'close':
      return 'ghost';
    
    // OUTLINE: Neutral view actions
    case 'view':
    case 'view_profile':
    case 'open':
    case 'expand':
      return 'outline';
    
    // DEFAULT: Fallback for unknown actions
    default:
      return 'default';
  }
}

/**
 * Get semantic variant for a button based on action label text
 * Useful when action ID is not available
 */
export function getVariantFromLabel(label: string): ButtonProps['variant'] {
  // Extract the core action from the label
  const actionId = label.toLowerCase().replace(/[^\w\s]/g, '').trim();
  return getVariantForAction(actionId);
}

/**
 * Determine if an action should be prominent (visually emphasized)
 * Used for layout decisions in cards
 */
export function isProminentAction(actionId: ActionId | string): boolean {
  const variant = getVariantForAction(actionId);
  return variant === 'join' || variant === 'default';
}
