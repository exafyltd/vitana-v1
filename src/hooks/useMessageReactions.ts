import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { realtimeChannel, removeRealtimeChannel } from '@/integrations/supabase/realtime';
import { useAuth } from '@/context/AuthProvider';
import { normalizeReactionEmoji, REACTION_CAP_ERROR } from '@/lib/reactions/reactionEmoji';
import { notifyError } from '@/lib/i18n-toast';

export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  users: Array<{
    user_id: string;
    display_name?: string;
    avatar_url?: string;
  }>;
  hasUserReacted: boolean;
}

export function useMessageReactions(messageId: string) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch reactions for a message via RPC (handles all message table types)
  const fetchReactions = useCallback(async () => {
    if (!messageId) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_message_reactions_text', { message_id_param: messageId });

      if (error) throw error;
      // Map RPC result to MessageReaction shape
      setReactions((data || []).map((r: any) => ({
        message_id: r.message_id,
        user_id: r.user_id,
        emoji: r.emoji,
        created_at: r.created_at,
        display_name: r.display_name,
        avatar_url: r.avatar_url,
      })));
    } catch (error) {
      console.warn('Error fetching reactions:', error);
    } finally {
      setLoading(false);
    }
  }, [messageId]);

  // Add reaction (always adds, allows multiple same emojis)
  const addReaction = useCallback(async (input: string) => {
    const emoji = normalizeReactionEmoji(input);
    if (!user || !emoji) return;

    try {
      // Always add reaction
      const newReaction: MessageReaction = {
        message_id: messageId,
        user_id: user.id,
        emoji,
        created_at: new Date().toISOString()
      };

      setReactions(prev => [...prev, newReaction]);

      const { error } = await supabase
        .from('message_reactions')
        .insert(newReaction);

      if (error) {
        // Rollback on error
        setReactions(prev => prev.filter(r => r !== newReaction));
        if (String((error as { message?: string }).message ?? '').includes(REACTION_CAP_ERROR)) {
          notifyError('chatNative.reactions.capReached');
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }, [messageId, user, reactions]);

  // Remove specific reaction (for right-click or long press)
  const removeReaction = useCallback(async (input: string, reactionId?: string) => {
    if (!user) return;
    const emoji = normalizeReactionEmoji(input) ?? input;
    // Rows match by canonical form, so a legacy bare heart toggles with the canonical heart.
    const sameEmoji = (r: MessageReaction) => (normalizeReactionEmoji(r.emoji) ?? r.emoji) === emoji;

    try {
      // If no specific reaction ID, remove the most recent one from this user
      const targetReaction = reactionId 
        ? reactions.find(r => r.message_id === messageId && sameEmoji(r))
        : reactions.filter(r => r.user_id === user.id && sameEmoji(r)).slice(-1)[0];

      if (!targetReaction) return;

      // Optimistic removal
      const optimisticReactions = reactions.filter(r => r !== targetReaction);
      setReactions(optimisticReactions);

      // Delete the row in the form it is stored in.
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', targetReaction.user_id)
        .eq('emoji', targetReaction.emoji)
        .eq('created_at', targetReaction.created_at);

      if (error) {
        // Rollback on error
        setReactions(reactions);
        throw error;
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  }, [messageId, user, reactions]);

  // Get reaction summary grouped by emoji
  const getReactionSummary = useCallback((): ReactionSummary[] => {
    // Legacy bare heart rows group with the canonical heart: one reaction, one count.
    const grouped = reactions.reduce((acc, reaction) => {
      const key = normalizeReactionEmoji(reaction.emoji) ?? reaction.emoji;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(reaction);
      return acc;
    }, {} as Record<string, MessageReaction[]>);

    return Object.entries(grouped).map(([emoji, reactionList]) => ({
      emoji,
      count: reactionList.length,
      users: reactionList.map(r => ({
        user_id: r.user_id,
        display_name: (r as any).display_name,
        avatar_url: (r as any).avatar_url
      })),
      hasUserReacted: user ? reactionList.some(r => r.user_id === user.id) : false
    }));
  }, [reactions, user]);

  // Set up real-time subscription
  useEffect(() => {
    fetchReactions();

    const channel = realtimeChannel(`reactions:${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      removeRealtimeChannel(channel);
    };
  }, [messageId, fetchReactions]);

  return {
    reactions,
    reactionSummary: getReactionSummary(),
    loading,
    addReaction,
    removeReaction
  };
}