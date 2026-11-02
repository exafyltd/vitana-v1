/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the
 * message stream of one DM / legacy group thread. Native twin of what the web
 * `ConversationView` takes from `useHybridMessages(context='global', threadId)`
 * → `useGlobalMessages` (class B, re-implemented):
 *
 *  - rows: React Query `["global-messages", threadId]` over `fetchThreadMessages`;
 *    older pages with `before` (loadOlderMessages, L1123).
 *  - send (deliverItem, L1242-1449): a local "sending" row keyed by a fresh
 *    client_message_id; a direct chat posts `/chat/send` (attachments/mentions
 *    only as content_data), a legacy group thread inserts into
 *    `global_messages` and bumps the thread + the sender's last_read_at. The
 *    stored row replaces the local one; a failure leaves it "failed" with
 *    Retry (same client_message_id) or Discard. A text to the Vitana bot then
 *    asks for her reply (L1402-1407).
 *  - markAsRead (L1648-1720, 300 ms debounce): `/chat/read` for a DM, the
 *    participant's last_read_at for a group, then the matching
 *    `new_chat_message` notifications.
 *  - realtime (L1866+): an INSERT into `chat_messages` addressed to me from
 *    this peer refetches the stream.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { markChatRead, requestVitanaReply, sendChatMessage } from './api';
import { chatMessageToView, enrichProfiles, fetchThreadMessages, MESSAGE_PAGE_SIZE } from './thread';
import { isVitanaBot, tempIdFor, type ChatViewMessage, type ConversationThread } from './types';

export function newClientMessageId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: (b: Uint8Array) => Uint8Array } }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b);
  else for (let i = 0; i < 16; i += 1) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export interface SendInput {
  content: string;
  messageType?: string;
  contentData?: Record<string, unknown> | null;
  replyToMessageId?: string | null;
}

type Outbox = Record<string, { row: ChatViewMessage; input: SendInput }>;

export function useConversation(thread: ConversationThread | null, userId: string | undefined) {
  const queryClient = useQueryClient();
  const threadId = thread?.id ?? null;
  const queryKey = useMemo(() => ['global-messages', threadId] as const, [threadId]);
  const [older, setOlder] = useState<ChatViewMessage[]>([]);
  const [hasOlder, setHasOlder] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [outbox, setOutbox] = useState<Outbox>({});
  /** Rows loaded around a jump target (deep link / reply quote), shown with the latest page. */
  const [jump, setJump] = useState<ChatViewMessage[]>([]);
  const markTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useQuery({
    queryKey,
    enabled: !!thread && !!userId,
    staleTime: 0,
    queryFn: () => fetchThreadMessages(thread as ConversationThread, userId as string),
  });

  useEffect(() => {
    setOlder([]);
    setJump([]);
    setHasOlder(true);
    setOutbox({});
  }, [threadId]);

  useEffect(() => {
    if (query.data && query.data.length < MESSAGE_PAGE_SIZE) setHasOlder(false);
  }, [query.data]);

  const messages = useMemo(() => {
    const server = query.data ?? [];
    const arrived = new Set(server.map((m) => m.client_message_id).filter(Boolean) as string[]);
    const seen = new Set<string>();
    const rows: ChatViewMessage[] = [];
    for (const m of [...older, ...jump, ...server]) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      rows.push(m);
    }
    if (jump.length > 0) rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
    for (const [cid, item] of Object.entries(outbox)) if (!arrived.has(cid)) rows.push(item.row);
    return rows;
  }, [older, jump, query.data, outbox]);

  const loadOlder = useCallback(async (): Promise<number> => {
    if (!thread || !userId || loadingOlder || !hasOlder) return 0;
    const oldest = messages.find((m) => !m.send_status);
    if (!oldest) return 0;
    setLoadingOlder(true);
    try {
      const page = await fetchThreadMessages(thread, userId, { before: oldest.created_at });
      if (page.length < MESSAGE_PAGE_SIZE) setHasOlder(false);
      setOlder((prev) => [...page, ...prev]);
      return page.length;
    } catch {
      return 0;
    } finally {
      setLoadingOlder(false);
    }
  }, [thread, userId, loadingOlder, hasOlder, messages]);

  const deliver = useCallback(
    async (cid: string, input: SendInput) => {
      if (!thread || !userId) return;
      setOutbox((prev) => (prev[cid] ? { ...prev, [cid]: { ...prev[cid], row: { ...prev[cid].row, send_status: 'sending' } } } : prev));
      try {
        let stored: ChatViewMessage;
        if (thread.type === 'group') {
          const supabase = getSupabase();
          const legacyId = thread.legacyThreadId ?? thread.id;
          const { data: inserted, error } = await supabase
            .from('global_messages')
            .insert({
              thread_id: legacyId,
              sender_id: userId,
              body: input.content,
              message_type: input.messageType || 'text',
              content_data: (input.messageType || 'text') !== 'text' ? input.contentData : undefined,
            } as never)
            .select()
            .single();
          if (error || !inserted) throw error || new Error('Group message insert failed');
          const now = new Date().toISOString();
          try {
            await Promise.all([
              supabase.from('global_message_threads').update({ updated_at: now } as never).eq('id', legacyId),
              supabase.from('global_thread_participants').update({ last_read_at: now } as never).eq('thread_id', legacyId).eq('user_id', userId),
            ]);
          } catch {
            // Bookkeeping only; the message is stored.
          }
          const row = inserted as unknown as Record<string, unknown>;
          stored = {
            id: String(row.id),
            thread_id: thread.id,
            sender_id: userId,
            body: input.content,
            message_type: input.messageType || 'text',
            content_data: input.contentData ?? null,
            created_at: String(row.created_at ?? now),
            client_message_id: cid,
          };
        } else {
          const cd = input.contentData ?? undefined;
          const payload: Record<string, unknown> = {};
          if (Array.isArray(cd?.attachments) && cd.attachments.length) payload.attachments = cd.attachments;
          if (Array.isArray(cd?.mentions) && cd.mentions.length) payload.mentions = cd.mentions;
          const hasPayload = Object.keys(payload).length > 0;
          const created = await sendChatMessage(thread.id, input.content, {
            ...(hasPayload ? { messageType: input.messageType || 'text', contentData: payload } : {}),
            clientMessageId: cid,
            replyToMessageId: input.replyToMessageId ?? null,
          });
          const profiles = await enrichProfiles([created.sender_id]).catch(() => ({}));
          stored = { ...chatMessageToView(created, thread.id, profiles), client_message_id: created.client_message_id || cid };
          if (!created.duplicate && isVitanaBot(thread.id) && (input.messageType || 'text') === 'text' && input.content.trim().length > 0) {
            requestVitanaReply(input.content).catch(() => undefined);
          }
        }
        queryClient.setQueryData<ChatViewMessage[]>(queryKey, (prev) => {
          const rows = prev ?? [];
          return rows.some((m) => m.id === stored.id) ? rows : [...rows, stored];
        });
        setOutbox((prev) => {
          const next = { ...prev };
          delete next[cid];
          return next;
        });
      } catch {
        setOutbox((prev) => (prev[cid] ? { ...prev, [cid]: { ...prev[cid], row: { ...prev[cid].row, send_status: 'failed' } } } : prev));
      }
    },
    [thread, userId, queryClient, queryKey],
  );

  const send = useCallback(
    async (input: SendInput) => {
      if (!thread || !userId) return;
      const cid = newClientMessageId();
      const replyTo = input.replyToMessageId && !input.replyToMessageId.startsWith('temp-') ? input.replyToMessageId : null;
      const row: ChatViewMessage = {
        id: tempIdFor(cid),
        thread_id: thread.id,
        sender_id: userId,
        body: input.content,
        message_type: input.messageType || 'text',
        content_data: input.contentData ?? null,
        created_at: new Date().toISOString(),
        client_message_id: cid,
        reply_to_message_id: replyTo,
        send_status: 'sending',
      };
      const stored = { ...input, replyToMessageId: replyTo };
      setOutbox((prev) => ({ ...prev, [cid]: { row, input: stored } }));
      await deliver(cid, stored);
    },
    [thread, userId, deliver],
  );

  const retry = useCallback(
    (cid: string) => {
      const item = outbox[cid];
      if (item) void deliver(cid, item.input);
    },
    [outbox, deliver],
  );

  const discard = useCallback((cid: string) => {
    setOutbox((prev) => {
      const next = { ...prev };
      delete next[cid];
      return next;
    });
  }, []);

  const markAsRead = useCallback(() => {
    if (!thread || !userId) return;
    if (markTimer.current) clearTimeout(markTimer.current);
    markTimer.current = setTimeout(async () => {
      markTimer.current = null;
      const supabase = getSupabase();
      try {
        if (thread.type === 'group') {
          await supabase
            .from('global_thread_participants')
            .update({ last_read_at: new Date().toISOString() } as never)
            .eq('thread_id', thread.legacyThreadId ?? thread.id)
            .eq('user_id', userId);
        } else {
          await markChatRead(thread.id);
        }
        await supabase
          .from('user_notifications')
          .update({ read_at: new Date().toISOString() } as never)
          .eq('type', 'new_chat_message')
          .eq('user_id', userId)
          .is('read_at', null)
          .filter(thread.type === 'group' ? 'data->>thread_id' : 'data->>sender_id', 'eq', thread.id);
      } catch {
        // Read state is best effort (web logs and moves on).
      }
    }, 300);
  }, [thread, userId]);

  useEffect(
    () => () => {
      if (markTimer.current) clearTimeout(markTimer.current);
    },
    [],
  );

  // Realtime: a DM from this peer to me refetches the stream.
  useEffect(() => {
    if (!thread || thread.type !== 'direct' || !userId) return undefined;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`chat_realtime_${Math.random().toString(36).slice(2, 11)}`)
      .on('postgres_changes' as never, { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `receiver_id=eq.${userId}` }, (payload: { new?: { sender_id?: string; group_id?: string | null } }) => {
        const raw = payload?.new;
        if (!raw || raw.group_id) return;
        if (raw.sender_id === thread.id) void queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [thread, userId, queryClient, queryKey]);

  const mergeRows = useCallback((rows: ChatViewMessage[]) => {
    setJump((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const m of rows) byId.set(m.id, m);
      return [...byId.values()];
    });
  }, []);

  return {
    messages,
    mergeRows,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    loadOlder,
    hasOlder,
    loadingOlder,
    send,
    retry,
    discard,
    markAsRead,
  };
}
