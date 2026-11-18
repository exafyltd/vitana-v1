/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — message
 * reactions. Native twin of web `src/hooks/useMessageReactions.ts`:
 * reactions come from `rpc('get_message_reactions_text', { message_id_param })`,
 * an add inserts into `message_reactions` (any emoji in the shared supported
 * set, canonical form), a remove deletes my latest one of that emoji; both are
 * optimistic with rollback. A member can have at most six distinct emojis per
 * message (enforced in the database); `addReaction` reports `'cap'` so the UI
 * can say so. Legacy bare heart rows group with the canonical heart. A realtime
 * change on `message_reactions` for the message refetches. Local (unsent) rows
 * have no reactions.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '../../../auth/client';
import { normalizeReactionEmoji, REACTION_CAP_ERROR } from './reactionEmoji';

export { QUICK_REACTIONS } from './reactionEmoji';

export type AddReactionResult = 'added' | 'cap' | 'ignored' | 'error';

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
    async (input: string): Promise<AddReactionResult> => {
      const emoji = normalizeReactionEmoji(input);
      if (!userId || !enabled || !emoji) return 'ignored';
      const row: Reaction = { message_id: messageId, user_id: userId, emoji, created_at: new Date().toISOString() };
      setReactions((prev) => [...prev, row]);
      const { error } = await getSupabase().from('message_reactions').insert(row as never);
      if (!error) return 'added';
      setReactions((prev) => prev.filter((r) => r !== row));
      return String((error as { message?: string }).message ?? '').includes(REACTION_CAP_ERROR) ? 'cap' : 'error';
    },
    [userId, enabled, messageId],
  );

  const removeReaction = useCallback(
    async (input: string) => {
      if (!userId) return;
      const emoji = normalizeReactionEmoji(input) ?? input;
      const target = reactions.filter((r) => r.user_id === userId && (normalizeReactionEmoji(r.emoji) ?? r.emoji) === emoji).slice(-1)[0];
      if (!target) return;
      const before = reactions;
      setReactions(reactions.filter((r) => r !== target));
      const { error } = await getSupabase()
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', target.user_id)
        .eq('emoji', target.emoji) // the row's stored form (a legacy bare heart stays deletable)
        .eq('created_at', target.created_at);
      if (error) setReactions(before);
    },
    [userId, reactions, messageId],
  );

  const summary = useMemo<ReactionSummary[]>(() => {
    const grouped = new Map<string, Reaction[]>();
    for (const r of reactions) {
      const key = normalizeReactionEmoji(r.emoji) ?? r.emoji;
      grouped.set(key, [...(grouped.get(key) ?? []), r]);
    }
    return [...grouped.entries()].map(([emoji, list]) => ({
      emoji,
      count: list.length,
      users: list.map((r) => ({ user_id: r.user_id, display_name: r.display_name, avatar_url: r.avatar_url })),
      hasUserReacted: !!userId && list.some((r) => r.user_id === userId),
    }));
  }, [reactions, userId]);

  return { summary, addReaction, removeReaction };
}
