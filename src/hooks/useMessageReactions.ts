import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';

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

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '🙏', '🎉'] as const;

export function useMessageReactions(messageId: string) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch reactions for a message
  const fetchReactions = useCallback(async () => {
    if (!messageId) return;
    
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select(`
          *,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('message_id', messageId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setReactions(data || []);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    } finally {
      setLoading(false);
    }
  }, [messageId]);

  // Toggle reaction (add if not exists, remove if exists)
  const toggleReaction = useCallback(async (emoji: string) => {
    if (!user || !ALLOWED_EMOJIS.includes(emoji as any)) return;

    const existingReaction = reactions.find(
      r => r.user_id === user.id && r.emoji === emoji
    );

    try {
      if (existingReaction) {
        // Remove reaction
        const optimisticReactions = reactions.filter(
          r => !(r.user_id === user.id && r.emoji === emoji)
        );
        setReactions(optimisticReactions);

        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);

        if (error) {
          // Rollback on error
          setReactions(reactions);
          throw error;
        }
      } else {
        // Add reaction
        const newReaction: MessageReaction = {
          message_id: messageId,
          user_id: user.id,
          emoji,
          created_at: new Date().toISOString()
        };

        setReactions([...reactions, newReaction]);

        const { error } = await supabase
          .from('message_reactions')
          .insert(newReaction);

        if (error) {
          // Rollback on error
          setReactions(reactions);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  }, [messageId, user, reactions]);

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
        display_name: (r as any).profiles?.display_name,
        avatar_url: (r as any).profiles?.avatar_url
      })),
      hasUserReacted: user ? reactionList.some(r => r.user_id === user.id) : false
    }));
  }, [reactions, user]);

  // Set up real-time subscription
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
    toggleReaction
  };
}