/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — message
 * reactions. Native twin of web `src/hooks/useMessageReactions.ts` (class B):
 * reactions come from `rpc('get_message_reactions_text', { message_id_param })`,
 * an add inserts into `message_reactions` (only the six quick emojis), a
 * remove deletes my latest one of that emoji; both are optimistic with
 * rollback. A realtime change on `message_reactions` for the message refetches.
 * Local (unsent) rows have no reactions.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '../../../auth/client';

export const QUICK_REACTIONS = ['👍', '❤', '😂', '😮', '🙏', '🎉'] as const;

interface Reaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  display_name?: string;
  avatar_url?: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  users: Array<{ user_id: string; display_name?: string; avatar_url?: string }>;
  hasUserReacted: boolean;
}

export function useReactions(messageId: string, userId: string | undefined) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const enabled = !!messageId && !messageId.startsWith('temp-');

  const fetchReactions = useCallback(async () => {
    if (!enabled) return;
    try {
      const { data, error } = await getSupabase().rpc('get_message_reactions_text' as never, { message_id_param: messageId } as never);
      if (error) throw error;
      setReactions(((data as Reaction[] | null) ?? []).map((r) => ({ ...r })));
    } catch {
      // Reactions stay as they were.
    }
  }, [enabled, messageId]);

  useEffect(() => {
    if (!enabled) return undefined;
    void fetchReactions();
    const supabase = getSupabase();
    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on('postgres_changes' as never, { event: '*', schema: 'public', table: 'message_reactions', filter: `message_id=eq.${messageId}` }, () => {
        void fetchReactions();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, messageId, fetchReactions]);

  const addReaction = useCallback(
    async (emoji: string) => {
      if (!userId || !enabled || !(QUICK_REACTIONS as readonly string[]).includes(emoji)) return;
      const row: Reaction = { message_id: messageId, user_id: userId, emoji, created_at: new Date().toISOString() };
      setReactions((prev) => [...prev, row]);
      const { error } = await getSupabase().from('message_reactions').insert(row as never);
      if (error) setReactions((prev) => prev.filter((r) => r !== row));
    },
    [userId, enabled, messageId],
  );

  const removeReaction = useCallback(
    async (emoji: string) => {
      if (!userId) return;
      const target = reactions.filter((r) => r.user_id === userId && r.emoji === emoji).slice(-1)[0];
      if (!target) return;
      const before = reactions;
      setReactions(reactions.filter((r) => r !== target));
      const { error } = await getSupabase()
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', target.user_id)
        .eq('emoji', emoji)
        .eq('created_at', target.created_at);
      if (error) setReactions(before);
    },
    [userId, reactions, messageId],
  );

  const summary = useMemo<ReactionSummary[]>(() => {
    const grouped = new Map<string, Reaction[]>();
    for (const r of reactions) grouped.set(r.emoji, [...(grouped.get(r.emoji) ?? []), r]);
    return [...grouped.entries()].map(([emoji, list]) => ({
      emoji,
      count: list.length,
      users: list.map((r) => ({ user_id: r.user_id, display_name: r.display_name, avatar_url: r.avatar_url })),
      hasUserReacted: !!userId && list.some((r) => r.user_id === userId),
    }));
  }, [reactions, userId]);

  return { summary, addReaction, removeReaction };
}
