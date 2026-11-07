/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — a thread in
 * the tenant ("Network") context: what web ConversationView takes from
 * `useHybridMessages('tenant')` → `src/hooks/useTenantMessages.ts` (class B,
 * re-implemented). The context comes from the deep link (`?context=tenant`,
 * Messages.tsx:191-193 / :219-221), as on the web.
 *
 *  - thread: `message_threads` (tenant) + active `thread_participants` with
 *    their `profiles`;
 *  - rows: `messages` of the thread and tenant, oldest first, senders from
 *    `profiles` of the tenant;
 *  - send (sendMessageLegacy): a local "sending" row, then an insert into
 *    `messages` (tenant_id, thread_id, sender_id, body, message_type,
 *    content_data, parent_message_id, sent_at, action_buttons) and the
 *    thread's updated_at; a failure leaves the row "failed" with Retry;
 *  - markAsRead: the participant's last_read_at (300 ms debounce);
 *  - realtime: INSERT / UPDATE on `messages` of this thread refetch.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { newClientMessageId, type SendInput } from './useConversation';
import { tempIdFor, type ChatViewMessage, type ConversationThread } from './types';

type Profile = { user_id: string; full_name?: string | null; display_name?: string | null; avatar_url?: string | null };

export async function fetchTenantThread(threadId: string, tenantId: string): Promise<ConversationThread> {
  const supabase = getSupabase();
  const { data: row, error } = await supabase.from('message_threads').select('*').eq('id', threadId).eq('tenant_id', tenantId).maybeSingle();
  if (error) throw error;
  if (!row) throw new Error('thread_not_found');
  const { data: parts } = await supabase
    .from('thread_participants')
    .select('thread_id, user_id, role, last_read_at, profile:profiles(user_id, full_name, display_name, avatar_url)')
    .eq('thread_id', threadId)
    .eq('is_active', true);
  const seen = new Set<string>();
  const one = (p: Profile | Profile[] | null | undefined) => (Array.isArray(p) ? p[0] : p) ?? null;
  const participants = ((parts ?? []) as unknown as Array<{ user_id: string; role: string; last_read_at?: string | null; profile?: Profile | Profile[] | null }>)
    .filter((p) => (seen.has(p.user_id) ? false : (seen.add(p.user_id), true)))
    .map((p) => {
      const prof = one(p.profile);
      return { user_id: p.user_id, role: p.role, last_read_at: p.last_read_at ?? null, display_name: prof?.display_name || prof?.full_name || null, avatar_url: prof?.avatar_url ?? null };
    });
  const t = row as { id: string; type?: string; name?: string | null; created_by?: string | null };
  return { id: t.id, type: t.type === 'group' ? 'group' : 'direct', name: t.name ?? null, created_by: t.created_by ?? null, participants };
}

export async function fetchTenantMessages(threadId: string, tenantId: string): Promise<ChatViewMessage[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('messages').select('*').eq('tenant_id', tenantId).eq('thread_id', threadId).order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const ids = Array.from(new Set(rows.map((m) => m.sender_id as string).filter(Boolean)));
  let profiles = new Map<string, Profile>();
  if (ids.length > 0) {
    const { data: senders, error: pErr } = await supabase.from('profiles').select('user_id, full_name, display_name, avatar_url').eq('tenant_id', tenantId).in('user_id', ids);
    if (pErr) throw pErr;
    profiles = new Map(((senders ?? []) as Profile[]).map((p) => [p.user_id, p]));
  }
  return rows.map((m) => {
    const p = profiles.get(m.sender_id as string);
    return {
      id: String(m.id),
      thread_id: threadId,
      sender_id: String(m.sender_id),
      body: String(m.body ?? ''),
      message_type: String(m.message_type ?? 'text'),
      content_data: (m.content_data as Record<string, unknown> | null) ?? null,
      created_at: String(m.created_at),
      read_at: (m.read_at as string | null) ?? null,
      delivered_at: (m.delivered_at as string | null) ?? null,
      parent_message_id: (m.parent_message_id as string | null) ?? null,
      action_buttons: (m.action_buttons as unknown[] | null) ?? null,
      sender: p ? { user_id: p.user_id, display_name: p.display_name || p.full_name || null, avatar_url: p.avatar_url ?? null } : null,
    } as ChatViewMessage;
  });
}

export function useTenantConversation(threadId: string | null, tenantId: string | null | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  const enabled = !!threadId && !!tenantId && !!userId;
  const threadQuery = useQuery({ queryKey: ['tenant-thread', threadId, tenantId], enabled, queryFn: () => fetchTenantThread(threadId as string, tenantId as string) });
  const queryKey = useMemo(() => ['tenant-messages', threadId, tenantId] as const, [threadId, tenantId]);
  const query = useQuery({ queryKey, enabled, staleTime: 0, queryFn: () => fetchTenantMessages(threadId as string, tenantId as string) });
  const [outbox, setOutbox] = useState<Record<string, { row: ChatViewMessage; input: SendInput }>>({});
  const markTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages = useMemo(() => [...(query.data ?? []), ...Object.values(outbox).map((o) => o.row)], [query.data, outbox]);

  const deliver = useCallback(
    async (cid: string, input: SendInput) => {
      if (!enabled) return;
      setOutbox((prev) => (prev[cid] ? { ...prev, [cid]: { ...prev[cid], row: { ...prev[cid].row, send_status: 'sending' } } } : prev));
      const supabase = getSupabase();
      try {
        const { error } = await supabase
          .from('messages')
          .insert({
            tenant_id: tenantId,
            thread_id: threadId,
            sender_id: userId,
            body: input.content,
            message_type: input.messageType || 'text',
            content_data: input.contentData ?? null,
            parent_message_id: input.replyToMessageId || null,
            sent_at: new Date().toISOString(),
            action_buttons: input.actionButtons ?? null,
          } as never)
          .select()
          .single();
        if (error) throw error;
        await supabase.from('message_threads').update({ updated_at: new Date().toISOString() } as never).eq('id', threadId as string).eq('tenant_id', tenantId as string);
        await queryClient.invalidateQueries({ queryKey });
        setOutbox((prev) => {
          const next = { ...prev };
          delete next[cid];
          return next;
        });
      } catch {
        setOutbox((prev) => (prev[cid] ? { ...prev, [cid]: { ...prev[cid], row: { ...prev[cid].row, send_status: 'failed' } } } : prev));
      }
    },
    [enabled, tenantId, threadId, userId, queryClient, queryKey],
  );

  const send = useCallback(
    async (input: SendInput) => {
      if (!enabled) return;
      const cid = newClientMessageId();
      const row: ChatViewMessage = {
        id: tempIdFor(cid),
        thread_id: threadId as string,
        sender_id: userId as string,
        body: input.content,
        message_type: input.messageType || 'text',
        content_data: input.contentData ?? null,
        created_at: new Date().toISOString(),
        client_message_id: cid,
        parent_message_id: input.replyToMessageId ?? null,
        send_status: 'sending',
      };
      setOutbox((prev) => ({ ...prev, [cid]: { row, input } }));
      await deliver(cid, input);
    },
    [enabled, threadId, userId, deliver],
  );

  const retry = useCallback((cid: string) => {
    const item = outbox[cid];
    if (item) void deliver(cid, item.input);
  }, [outbox, deliver]);

  const discard = useCallback((cid: string) => {
    setOutbox((prev) => {
      const next = { ...prev };
      delete next[cid];
      return next;
    });
  }, []);

  const markAsRead = useCallback(() => {
    if (!enabled) return;
    if (markTimer.current) clearTimeout(markTimer.current);
    markTimer.current = setTimeout(() => {
      markTimer.current = null;
      void getSupabase()
        .from('thread_participants')
        .update({ last_read_at: new Date().toISOString() } as never)
        .eq('thread_id', threadId as string)
        .eq('user_id', userId as string)
        .then(() => undefined, () => undefined);
    }, 300);
  }, [enabled, threadId, userId]);

  useEffect(() => () => {
    if (markTimer.current) clearTimeout(markTimer.current);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const supabase = getSupabase();
    const refetch = () => void queryClient.invalidateQueries({ queryKey });
    const channel = supabase
      .channel(`tenant_messages_${threadId}`)
      .on('postgres_changes' as never, { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` }, refetch)
      .on('postgres_changes' as never, { event: 'UPDATE', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` }, refetch)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, threadId, queryClient, queryKey]);

  return {
    thread: threadQuery.data ?? null,
    threadError: threadQuery.isError,
    refetchThread: threadQuery.refetch,
    messages,
    mergeRows: (_rows: ChatViewMessage[]) => undefined,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    loadOlder: async () => 0,
    hasOlder: false,
    loadingOlder: false,
    send,
    retry,
    discard,
    markAsRead,
  };
}

/** `/inbox/u/:recipientId?context=tenant`: the member's direct tenant thread with that person (Messages.tsx pendingRecipient). */
export async function findTenantDirectThread(recipientId: string, userId: string, tenantId: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data: mine } = await supabase.from('thread_participants').select('thread_id').eq('user_id', userId).eq('is_active', true);
  const ids = ((mine ?? []) as Array<{ thread_id: string }>).map((p) => p.thread_id);
  if (ids.length === 0) return null;
  const { data: theirs } = await supabase.from('thread_participants').select('thread_id').eq('user_id', recipientId).eq('is_active', true).in('thread_id', ids);
  const shared = ((theirs ?? []) as Array<{ thread_id: string }>).map((p) => p.thread_id);
  if (shared.length === 0) return null;
  const { data: threads } = await supabase.from('message_threads').select('id, type').eq('tenant_id', tenantId).in('id', shared).order('updated_at', { ascending: false });
  const rows = (threads ?? []) as Array<{ id: string; type?: string }>;
  return (rows.find((r) => r.type !== 'group') ?? null)?.id ?? null;
}
