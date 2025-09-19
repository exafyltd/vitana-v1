/**
 * Secure accessor functions for privacy-hardened database access
 * Replaces direct queries to sensitive tables with secure function calls
 */

import { supabase } from '@/integrations/supabase/client';

export interface MinimalProfile {
  user_id: string;
  display_name: string;
  avatar_url: string;
}

export interface ThreadParticipant {
  user_id: string;
  display_name: string;
  avatar_url: string;
  role: string;
  joined_at: string;
  last_read_at: string | null;
}

export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  display_name: string;
  avatar_url: string;
}

/**
 * ProfileDirectory - Secure profile access with minimal data exposure
 */
export class ProfileDirectory {
  /**
   * Get minimal profile data for specific user IDs only
   * Replaces: direct queries to global_community_profiles
   */
  static async getMinimalByIds(userIds: string[]): Promise<MinimalProfile[]> {
    if (!userIds.length) return [];
    
    try {
      const { data, error } = await supabase.rpc('get_minimal_profiles_by_ids', {
        user_ids: userIds
      });

      if (error) {
        console.error('Error fetching minimal profiles:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getMinimalByIds:', error);
      return [];
    }
  }

  /**
   * Search minimal profiles with scope restrictions
   * Replaces: open-ended profile directory queries
   */
  static async searchMinimal(
    query: string, 
    scope: 'global' | 'tenant' = 'global'
  ): Promise<MinimalProfile[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const { data, error } = await supabase.rpc('search_minimal_profiles', {
        search_query: query.trim(),
        search_scope: scope
      });

      if (error) {
        console.error('Error searching profiles:', error);
        // Return empty array instead of throwing to prevent UI breaks
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchMinimal:', error);
      return [];
    }
  }
}

/**
 * Threads - Secure thread access with membership validation
 */
export class Threads {
  /**
   * Get thread participants with membership check
   * Replaces: direct queries to global_thread_participants/thread_participants
   */
  static async getParticipants(
    threadId: string, 
    context: 'global' | 'tenant' = 'global'
  ): Promise<ThreadParticipant[]> {
    if (!threadId) return [];

    try {
      const { data, error } = await supabase.rpc('get_thread_participants', {
        thread_id_param: threadId,
        context_param: context
      });

      if (error) {
        console.error('Error fetching thread participants:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getParticipants:', error);
      return [];
    }
  }
}

/**
 * Reactions - Secure reaction access with message authorization
 */
export class Reactions {
  /**
   * List reactions for a message with access check
   * Replaces: direct queries to message_reactions
   */
  static async listForMessage(messageId: string): Promise<MessageReaction[]> {
    if (!messageId) return [];

    try {
      const { data, error } = await supabase.rpc('get_message_reactions', {
        message_id_param: messageId
      });

      if (error) {
        console.error('Error fetching message reactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in listForMessage:', error);
      return [];
    }
  }

  /**
   * Toggle reaction on a message with access check
   * Replaces: direct insert/delete on message_reactions
   */
  static async toggle(messageId: string, emoji: string): Promise<boolean> {
    if (!messageId || !emoji) return false;

    try {
      const { data, error } = await supabase.rpc('toggle_message_reaction', {
        message_id_param: messageId,
        emoji_param: emoji
      });

      if (error) {
        console.error('Error toggling reaction:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in toggle:', error);
      return false;
    }
  }
}

/**
 * Legacy support - migrate existing direct queries to secure accessors
 */
export const legacyMigrationHelpers = {
  /**
   * Helper to replace direct global_community_profiles queries
   */
  async getGlobalProfiles(userIds: string[]): Promise<MinimalProfile[]> {
    console.warn('Using legacy profile access - migrate to ProfileDirectory.getMinimalByIds');
    return ProfileDirectory.getMinimalByIds(userIds);
  },

  /**
   * Helper to replace direct participant queries
   */
  async getThreadParticipants(threadId: string, context: 'global' | 'tenant'): Promise<ThreadParticipant[]> {
    console.warn('Using legacy participant access - migrate to Threads.getParticipants');
    return Threads.getParticipants(threadId, context);
  },

  /**
   * Helper to replace direct reaction queries
   */
  async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    console.warn('Using legacy reaction access - migrate to Reactions.listForMessage');
    return Reactions.listForMessage(messageId);
  }
};