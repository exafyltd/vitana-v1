/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the Network
 * (tenant) inbox thread list, re-implemented natively from the threads query
 * of the web `src/hooks/useTenantMessages.ts:75-209` (class B: web Supabase
 * client). Same tables, columns and filters: the member's active
 * `thread_participants`, the tenant's `message_threads`, the participants
 * with their `profiles`, the last `messages` row and the unread count since
 * `last_read_at`. Reads only.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { InboxThread } from './threads-model';

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchTenantThreads(sb: SupabaseClient, userId: string, tenantId: string): Promise<InboxThread[]> {
  const { data: mine, error: partErr } = await (sb.from('thread_participants').select('thread_id, last_read_at').eq('user_id', userId).eq('is_active', true) as any);
  if (partErr) throw partErr;
  const threadIds: string[] = (mine || []).map((p: any) => p.thread_id);
  if (threadIds.length === 0) return [];

  const { data: threadRows, error: threadError } = await (sb.from('message_threads').select('*').eq('tenant_id', tenantId).in('id', threadIds).order('updated_at', { ascending: false }) as any);
  if (threadError) throw threadError;

  const { data: allParticipants } = await (sb
    .from('thread_participants')
    .select('thread_id, user_id, role, last_read_at, profile:profiles(user_id, full_name, display_name, avatar_url)')
    .in('thread_id', threadIds)
    .eq('is_active', true) as any);

  const seen = new Set<string>();
  const participants = ((allParticipants || []) as any[]).filter((p) => {
    const key = `${p.thread_id}-${p.user_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const withDetails: InboxThread[] = await Promise.all(
    ((threadRows || []) as any[]).map(async (thread) => {
      const { data: lastMessage } = await (sb.from('messages').select('*').eq('thread_id', thread.id).eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1).single() as any);
      const lastReadAt = ((mine || []) as any[]).find((p) => p.thread_id === thread.id)?.last_read_at;
      let q = sb.from('messages').select('*', { count: 'exact', head: true }).eq('thread_id', thread.id).eq('tenant_id', tenantId) as any;
      if (lastReadAt) q = q.gt('created_at', lastReadAt);
      const { count } = await q;
      return {
        ...thread,
        participants: participants
          .filter((p) => p.thread_id === thread.id)
          .map((p) => ({ user_id: p.user_id, role: p.role, last_read_at: p.last_read_at, full_name: p.profile?.full_name, display_name: p.profile?.display_name, avatar_url: p.profile?.avatar_url })),
        last_message: lastMessage || undefined,
        unread_count: count || 0,
      } as InboxThread;
    }),
  );

  const unique = new Set<string>();
  return withDetails.filter((t) => (unique.has(t.id) ? false : (unique.add(t.id), true)));
}
