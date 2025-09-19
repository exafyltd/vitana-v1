import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { Reactions, type MessageReaction } from '@/lib/secure-accessors';
import { supabase } from '@/integrations/supabase/client';

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

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '🙏', '🎉'] as const;

export function useMessageReactions(messageId: string) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch reactions for a message using secure accessor
  const fetchReactions = useCallback(async () => {
    if (!messageId) return;
    
    try {
      const reactionsData = await Reactions.listForMessage(messageId);
      setReactions(reactionsData);
    } catch (error) {
      console.error('Error fetching reactions:', error);
      setReactions([]);
    } finally {
      setLoading(false);
    }
  }, [messageId]);

  // Add reaction (using secure toggle accessor)
  const addReaction = useCallback(async (emoji: string) => {
    if (!user || !ALLOWED_EMOJIS.includes(emoji as any)) return;

    try {
      const wasAdded = await Reactions.toggle(messageId, emoji);
      
      if (wasAdded) {
        // Optimistically add reaction
        const newReaction: MessageReaction = {
          message_id: messageId,
          user_id: user.id,
          emoji: emoji,
          created_at: new Date().toISOString(),
          display_name: 'You',
          avatar_url: ''
        };
        setReactions(prev => [...prev, newReaction]);
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      // Refresh on error to ensure consistency
      fetchReactions();
    }
  }, [messageId, user, fetchReactions]);

  // Remove reaction (using secure toggle accessor)
  const removeReaction = useCallback(async (emoji: string) => {
    if (!user) return;

    try {
      const wasRemoved = await Reactions.toggle(messageId, emoji);
      
      if (!wasRemoved) {
        // Reaction was removed (toggle returned false)
        setReactions(prev => prev.filter(r => 
          !(r.message_id === messageId && r.user_id === user.id && r.emoji === emoji)
        ));
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
      // Refresh on error to ensure consistency
      fetchReactions();
    }
  }, [messageId, user, fetchReactions]);

  // Get reaction summary grouped by emoji
  const getReactionSummary = useCallback((): ReactionSummary[] => {
    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push(reaction);
      return acc;
    }, {} as Record<string, MessageReaction[]>);

    return Object.entries(grouped).map(([emoji, reactionList]) => ({
      emoji,
      count: reactionList.length,
      users: reactionList.map(r => ({
        user_id: r.user_id,
        display_name: r.display_name,
        avatar_url: r.avatar_url
      })),
      hasUserReacted: user ? reactionList.some(r => r.user_id === user.id) : false
    }));
  }, [reactions, user]);

  // Set up real-time subscription - RLS will filter events automatically
  useEffect(() => {
    fetchReactions();

    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`
        },
        () => {
          // Refresh reactions to get proper user data via secure accessor
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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