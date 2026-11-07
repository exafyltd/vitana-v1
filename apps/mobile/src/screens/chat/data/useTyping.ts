/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — typing
 * indicators. Native twin of web `src/hooks/useTypingIndicators.ts` (class B):
 * the broadcast channel `typing:<threadId>` carries `typing_start` (with the
 * typer's community name and avatar) and `typing_stop`; a start from someone
 * else shows them for 1.5 s unless a stop comes first; my own events are
 * ignored. Presence/typing writes happen only on a real device (G1).
 */
import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../../../auth/client';

export interface TypingUser {
  id: string;
  name: string;
  avatar?: string;
}

export const TYPING_DISPLAY_MS = 1500;

type Payload = { payload?: { user_id?: string; name?: string; avatar?: string } };

export function useTyping(threadId: string | null | undefined, userId: string | undefined) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  const startTyping = useCallback(async () => {
    if (!userId || !threadId) return;
    try {
      const supabase = getSupabase();
      const [{ data: globalProfile }, { data: mainProfile }] = await Promise.all([
        supabase.from('global_community_profiles').select('display_name, avatar_url').eq('user_id', userId).maybeSingle(),
        supabase.from('profiles').select('display_name, full_name, avatar_url').eq('user_id', userId).maybeSingle(),
      ]);
      const gp = globalProfile as { display_name?: string; avatar_url?: string } | null;
      const mp = mainProfile as { display_name?: string; full_name?: string; avatar_url?: string } | null;
      await supabase.channel(`typing:${threadId}`).send({
        type: 'broadcast',
        event: 'typing_start',
        payload: {
          user_id: userId,
          thread_id: threadId,
          name: gp?.display_name || mp?.display_name || mp?.full_name || 'Unknown User',
          avatar: gp?.avatar_url || mp?.avatar_url || undefined,
          timestamp: Date.now(),
        },
      });
    } catch {
      // Typing is best effort.
    }
  }, [userId, threadId]);

  const stopTyping = useCallback(async () => {
    if (!userId || !threadId) return;
    try {
      await getSupabase()
        .channel(`typing:${threadId}`)
        .send({ type: 'broadcast', event: 'typing_stop', payload: { user_id: userId, thread_id: threadId, timestamp: Date.now() } });
    } catch {
      // Typing is best effort.
    }
  }, [userId, threadId]);

  useEffect(() => {
    if (!userId || !threadId) return undefined;
    const supabase = getSupabase();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const channel = supabase
      .channel(`typing:${threadId}`)
      .on('broadcast', { event: 'typing_start' }, (msg: Payload) => {
        const p = msg.payload ?? {};
        if (!p.user_id || p.user_id === userId) return;
        const id = p.user_id;
        setTypingUsers((prev) => (prev.some((u) => u.id === id) ? prev : [...prev, { id, name: p.name || 'Unknown User', avatar: p.avatar }]));
        timers.push(setTimeout(() => setTypingUsers((prev) => prev.filter((u) => u.id !== id)), TYPING_DISPLAY_MS));
      })
      .on('broadcast', { event: 'typing_stop' }, (msg: Payload) => {
        const id = msg.payload?.user_id;
        setTypingUsers((prev) => prev.filter((u) => u.id !== id));
      })
      .subscribe();
    return () => {
      timers.forEach(clearTimeout);
      void supabase.removeChannel(channel);
    };
  }, [userId, threadId]);

  return { typingUsers, startTyping, stopTyping };
}
