/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the data
 * side of `/inbox/g/:groupId` (chat_groups). Native twin of the state and
 * effects in web `src/pages/messages/GroupChat.tsx` (class-B imports, so
 * re-implemented over the native gateway / Supabase client):
 *
 *  - open: `GET /chat/groups/:id` + the latest 100 messages, newest last
 *    (L211-245); a refetch keeps this screen's unsent rows (mergeGroupRows).
 *  - `POST /chat/groups/:id/read` whenever the message count changes (L256-259).
 *  - realtime: INSERT into `chat_messages` with this group_id reloads the
 *    messages (L264-275); an 8 s poll is the reconnect fallback (L277-281).
 *  - send (L435-501): a local "sending" row with a client_message_id, posted
 *    in send order, 20 s timeout, "failed" + Retry on error.
 *  - edit / delete own messages through the gateway (L623-654).
 *  - mention candidates: the roster minus me, bots and non-mentionable
 *    accounts (L160-166).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabase } from '../../../auth/client';
import { notify, notifyError } from '../../../ports/ui';
import {
  deleteGroupMessage,
  fetchGroup,
  fetchGroupMessages,
  fetchGroupMessagesAround,
  markGroupRead,
  sendGroupMessage,
  updateGroupMessage,
  type ChatGroupMember,
  type ChatGroupMessage,
  type GroupWithMembers,
} from './api';
import { newClientMessageId, type SendInput } from './useConversation';
import { tempIdFor, type ChatViewMessage } from './types';

export const GROUP_POLL_INTERVAL_MS = 8000;
const SEND_TIMEOUT_MS = 20_000;

type GroupRow = ChatGroupMessage & { send_status?: 'sending' | 'failed' };

export function mergeGroupRows(prev: GroupRow[], server: GroupRow[]): GroupRow[] {
  const arrived = new Set(server.map((m) => m.client_message_id).filter(Boolean) as string[]);
  const local = prev.filter((m) => m.send_status && !(m.client_message_id && arrived.has(m.client_message_id)));
  return local.length === 0 ? server : [...server, ...local];
}

export function groupRowToView(msg: GroupRow, groupId: string, member?: ChatGroupMember): ChatViewMessage {
  return {
    id: msg.id,
    thread_id: groupId,
    sender_id: msg.sender_id,
    body: msg.content,
    message_type: msg.message_type || 'text',
    content_data: (msg.metadata as Record<string, unknown> | undefined) ?? null,
    created_at: msg.created_at,
    send_status: msg.send_status,
    client_message_id: msg.client_message_id ?? null,
    reply_to_message_id: msg.reply_to_message_id ?? null,
    sender: member ? { user_id: member.user_id, display_name: member.display_name, avatar_url: member.avatar_url } : null,
  };
}

export function useGroupChat(groupId: string | undefined, userId: string | undefined) {
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [jumpRows, setJumpRows] = useState<GroupRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const queued = useRef<Set<string>>(new Set());

  const loadMessages = useCallback(async () => {
    if (!groupId) return;
    try {
      const msgs = await fetchGroupMessages(groupId, 100);
      setRows((prev) => mergeGroupRows(prev, msgs.slice().reverse()));
      setMessagesLoaded(true);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load group');
    }
  }, [groupId]);

  const loadGroup = useCallback(async () => {
    if (!groupId) return;
    try {
      setGroup(await fetchGroup(groupId));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load group');
    }
  }, [groupId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setMessagesLoaded(false);
    setJumpRows([]);
    void Promise.all([loadGroup(), loadMessages()]).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadGroup, loadMessages]);

  useEffect(() => {
    if (!groupId) return;
    markGroupRead(groupId).catch(() => undefined);
  }, [groupId, rows.length]);

  useEffect(() => {
    if (!groupId) return undefined;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`group_chat_${groupId}`)
      .on('postgres_changes' as never, { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `group_id=eq.${groupId}` }, () => {
        void loadMessages();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [groupId, loadMessages]);

  useEffect(() => {
    const id = setInterval(() => {
      void loadMessages();
    }, GROUP_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadMessages]);

  const deliver = useCallback(
    async (row: GroupRow) => {
      if (!groupId || !row.client_message_id) return;
      const cid = row.client_message_id;
      setRows((prev) => prev.map((m) => (m.client_message_id === cid && m.send_status ? { ...m, send_status: 'sending' } : m)));
      try {
        const saved = await Promise.race([
          sendGroupMessage(groupId, row.content, {
            messageType: row.message_type,
            contentData: (row.metadata as Record<string, unknown>) || null,
            clientMessageId: cid,
            replyToMessageId: row.reply_to_message_id ?? null,
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('send_timeout')), SEND_TIMEOUT_MS)),
        ]);
        const { duplicate: _dup, ...stored } = saved;
        void _dup;
        setRows((prev) => {
          const rest = prev.filter((m) => !(m.client_message_id === cid && m.send_status));
          return rest.some((m) => m.id === stored.id) ? rest : [...rest, { ...stored, client_message_id: stored.client_message_id ?? cid }];
        });
      } catch {
        setRows((prev) => prev.map((m) => (m.client_message_id === cid && m.send_status ? { ...m, send_status: 'failed' } : m)));
      }
    },
    [groupId],
  );

  const enqueue = useCallback(
    (row: GroupRow) => {
      const cid = row.client_message_id;
      if (!cid || queued.current.has(cid)) return chain.current;
      queued.current.add(cid);
      chain.current = chain.current
        .catch(() => undefined)
        .then(() => deliver(row))
        .finally(() => queued.current.delete(cid));
      return chain.current;
    },
    [deliver],
  );

  const send = useCallback(
    async (input: SendInput) => {
      if (!groupId) return;
      const cid = newClientMessageId();
      const replyTo = input.replyToMessageId && !input.replyToMessageId.startsWith('temp-') ? input.replyToMessageId : null;
      const optimistic: GroupRow = {
        id: tempIdFor(cid),
        sender_id: userId || '',
        group_id: groupId,
        content: input.content,
        created_at: new Date().toISOString(),
        message_type: input.messageType || 'text',
        metadata: input.contentData || undefined,
        client_message_id: cid,
        reply_to_message_id: replyTo,
        send_status: 'sending',
      };
      setRows((prev) => [...prev, optimistic]);
      await enqueue(optimistic);
    },
    [groupId, userId, enqueue],
  );

  const retry = useCallback(
    (cid: string) => {
      const row = rows.find((m) => m.client_message_id === cid && m.send_status === 'failed');
      if (row) void enqueue(row);
    },
    [rows, enqueue],
  );

  const updateMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!groupId || !content.trim()) return;
      try {
        const saved = await updateGroupMessage(groupId, messageId, content.trim());
        setRows((prev) => prev.map((m) => (m.id === messageId ? saved : m)));
        setJumpRows((prev) => prev.map((m) => (m.id === messageId ? saved : m)));
      } catch (err) {
        notifyError('toasts.messages.updateFailed', 'toasts.messages.failedUpdateMessagePleaseTryAgain');
        throw err;
      }
    },
    [groupId],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!groupId) return;
      if (messageId.startsWith('temp-')) {
        const cid = messageId.slice('temp-'.length);
        if (!queued.current.has(cid)) setRows((prev) => prev.filter((m) => m.id !== messageId));
        return;
      }
      try {
        await deleteGroupMessage(groupId, messageId);
        setRows((prev) => prev.filter((m) => m.id !== messageId));
        setJumpRows((prev) => prev.filter((m) => m.id !== messageId));
        notify('toasts.messages.messageDeleted');
      } catch {
        notifyError('toasts.messages.deleteFailed', 'toasts.messages.failedDeleteMessagePleaseTryAgain');
      }
    },
    [groupId],
  );

  /** A deep-linked message that is not in the latest page: load the window around it (web loadAround L503-512). */
  const loadAround = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!groupId) return false;
      try {
        const win = await fetchGroupMessagesAround(groupId, messageId, 40);
        if (!win || win.data.length === 0) return false;
        setJumpRows((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          for (const m of win.data) byId.set(m.id, m);
          return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
        });
        return true;
      } catch {
        return false;
      }
    },
    [groupId],
  );

  const memberById = useMemo(() => {
    const map = new Map<string, ChatGroupMember>();
    (group?.members || []).forEach((m) => map.set(m.user_id, m));
    return map;
  }, [group]);

  const messages = useMemo(() => {
    if (!groupId) return [];
    const newestFirstLoaded = rows.find((m) => !m.send_status)?.created_at;
    const older = jumpRows.filter((m) => !rows.some((r) => r.id === m.id) && (!newestFirstLoaded || m.created_at < newestFirstLoaded));
    return [...older, ...rows].map((m) => groupRowToView(m, groupId, memberById.get(m.sender_id)));
  }, [rows, jumpRows, groupId, memberById]);

  const mentionCandidates = useMemo(
    () =>
      (group?.members || [])
        .filter((m) => m.user_id !== userId && !m.is_bot && m.mentionable !== false && !!m.display_name?.trim())
        .map((m) => ({ user_id: m.user_id, display_name: (m.display_name as string).trim(), avatar_url: m.avatar_url })),
    [group, userId],
  );

  return {
    group,
    messages,
    isLoading,
    messagesLoaded,
    loadError,
    send,
    retry,
    updateMessage,
    deleteMessage,
    loadAround,
    mentionCandidates,
  };
}
