/**
 * Utility functions for consistent participant selection across conversation components
 */
import { isVitanaBot, VITANA_BOT_DISPLAY_NAME, VITANA_BOT_AVATAR_URL } from '@/lib/vitanaBotIdentity';

export interface ThreadParticipant {
  user_id: string;
  display_name?: string;
  full_name?: string;
  avatar_url?: string;
  profile?: {
    display_name?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface ConversationThread {
  id: string;
  name?: string;
  type?: string;
  participants?: ThreadParticipant[];
}

/**
 * Gets the "other participant" in a conversation (not the current user)
 * For group chats, returns the first other participant
 * For direct chats, returns the single other participant
 */
export function getOtherParticipant(
  thread: ConversationThread | null | undefined,
  currentUserId: string | undefined
): ThreadParticipant | null {
  if (!thread?.participants || !currentUserId) {
    return null;
  }

  // Find all participants who are not the current user
  const otherParticipants = thread.participants.filter(
    (p: ThreadParticipant) => p.user_id !== currentUserId
  );

  // Return the first other participant (or null if none found)
  return otherParticipants[0] || null;
}

/**
 * Gets the display name for a participant
 */
export function getParticipantDisplayName(participant: ThreadParticipant | null): string {
  if (!participant) return 'Unknown';
  if (isVitanaBot(participant.user_id)) return VITANA_BOT_DISPLAY_NAME;
  
  return (
    participant.profile?.display_name ||
    participant.profile?.full_name ||
    participant.display_name ||
    participant.full_name ||
    'Unknown'
  );
}

/**
 * Gets the avatar URL for a participant
 */
export function getParticipantAvatarUrl(participant: ThreadParticipant | null): string | null {
  if (!participant) return null;
  
  return (
    participant.profile?.avatar_url ||
    participant.avatar_url ||
    null
  );
}

/**
 * Gets the conversation title for display
 */
export function getConversationDisplayTitle(
  thread: ConversationThread | null | undefined,
  currentUserId: string | undefined
): string {
  if (!thread) return 'Conversation';

  // For group chats, use the thread name
  if (thread.type === 'group' && thread.name) {
    return thread.name;
  }

  // For direct chats, show other participant's name
  const otherParticipant = getOtherParticipant(thread, currentUserId);
  if (otherParticipant) {
    return getParticipantDisplayName(otherParticipant);
  }

  // Fallback
  return thread.name || 'Conversation';
}

/**
 * Gets only the first name of a participant
 */
export function getParticipantFirstName(participant: ThreadParticipant | null): string {
  if (!participant) return '';
  const fullName =
    participant.profile?.display_name ||
    participant.profile?.full_name ||
    participant.display_name ||
    participant.full_name ||
    '';
  return fullName.split(' ')[0] || fullName;
}

/**
 * Gets the conversation avatar URL for display
 */
export function getConversationDisplayAvatar(
  thread: ConversationThread | null | undefined,
  currentUserId: string | undefined
): string | null {
  if (!thread) return null;

  // For group chats, don't return a single avatar (should use GroupAvatarStack)
  if (thread.type === 'group') {
    return null;
  }

  // For direct chats, show other participant's avatar
  const otherParticipant = getOtherParticipant(thread, currentUserId);
  return getParticipantAvatarUrl(otherParticipant);
}