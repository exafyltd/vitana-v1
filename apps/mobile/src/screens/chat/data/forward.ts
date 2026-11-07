/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — forwarding
 * a message (VTID-05138), native twin of web
 * `src/components/messages/forwardTargets.ts` + the send part of
 * `ForwardMessageSheet.tsx`:
 *
 *  - targets: the member's real DMs (gateway conversations, Vitana excluded,
 *    at most 30, names from the profiles) then the groups, filtered by name;
 *  - up to 5 targets; each gets its own message with `forwarded: true`;
 *    stored attachments are first copied into `{me}/{target}/…` (read access
 *    follows the path); voice is never forwarded; one target's failure never
 *    stops the others ("Could not forward to {name}");
 *  - share outside: 7-day signed links for the files.
 */
import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notifyError } from '../../../ports/ui';
import { fetchConversations, fetchGroups, sendChatMessage, sendGroupMessage } from './api';
import { enrichProfiles } from './thread';
import { isVitanaBot } from './types';
import { copyChatAttachmentForThread, getSignedAttachmentUrl } from './upload';

export const MAX_FORWARD_TARGETS = 5;
const MAX_CHATS = 30;
export const FORWARD_SHARE_LINK_TTL_DAYS = 7;
export const FORWARD_SHARE_LINK_TTL_S = FORWARD_SHARE_LINK_TTL_DAYS * 24 * 60 * 60;

export interface ForwardTarget {
  kind: 'dm' | 'group';
  id: string;
  name: string;
}

export type ChatAttachmentLike = { type?: string; mime?: string; filename?: string; name?: string; url?: string; path?: string; size?: number; duration?: number };

export interface ForwardPayload {
  body: string;
  attachments: ChatAttachmentLike[];
  shareImages?: { url: string; filename: string }[];
}

export const targetKey = (x: ForwardTarget) => `${x.kind}:${x.id}`;

export function isAudioAttachment(att: ChatAttachmentLike | null | undefined): boolean {
  if (!att) return false;
  return att.type === 'voice' || att.type === 'audio' || (att.mime || '').toLowerCase().startsWith('audio/');
}

const NON_FORWARDABLE = new Set(['voice', 'template', 'calendar_invite', 'service_booking', 'payment_request', 'exchange_and_send', 'payment_confirmation', 'system', 'shared_content']);

/** web canForwardMessage (+ VTID-05321: a shared card is not forwarded as its caption). */
export function canForwardMessage(message: { message_type?: string; body?: string; content_data?: Record<string, unknown> | null }): boolean {
  if (NON_FORWARDABLE.has(message.message_type || '')) return false;
  const atts = Array.isArray(message.content_data?.attachments) ? (message.content_data?.attachments as ChatAttachmentLike[]) : [];
  const files = Array.isArray(message.content_data?.files) ? (message.content_data?.files as Array<{ type?: string }>) : [];
  if (atts.some(isAudioAttachment) || files.some((f) => (f?.type || '').startsWith('audio/'))) return false;
  return (message.body || '').trim().length > 0 || atts.length > 0 || files.length > 0;
}

async function loadDmTargets(): Promise<ForwardTarget[]> {
  const conversations = await fetchConversations();
  const peers = conversations.map((c) => c.peer_id).filter((id) => !!id && !isVitanaBot(id)).slice(0, MAX_CHATS);
  const profiles = await enrichProfiles(peers).catch(() => ({}) as Awaited<ReturnType<typeof enrichProfiles>>);
  return peers.map((id) => ({ kind: 'dm' as const, id, name: profiles[id]?.display_name || '' }));
}

export function useChatTargets(open: boolean, query: string, userId: string | undefined) {
  const queryClient = useQueryClient();
  const dms = useQuery({ queryKey: ['chat-forward-dms', userId], queryFn: loadDmTargets, enabled: open && !!userId, staleTime: 60_000 });
  const groups = useQuery({ queryKey: ['chat-groups', userId], queryFn: fetchGroups, enabled: open && !!userId, staleTime: 2 * 60_000 });
  const targets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all: ForwardTarget[] = [...(dms.data ?? []), ...(groups.data ?? []).map((g) => ({ kind: 'group' as const, id: g.id, name: g.name }))];
    return q ? all.filter((x) => x.name.toLowerCase().includes(q)) : all;
  }, [dms.data, groups.data, query]);
  const refreshTargets = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['chat-forward-dms', userId] });
    void queryClient.invalidateQueries({ queryKey: ['chat-groups', userId] });
  }, [queryClient, userId]);
  return { targets, loading: dms.isLoading || groups.isLoading, refreshTargets };
}

export function useTargetSelection() {
  const [picked, setPicked] = useState<ForwardTarget[]>([]);
  const pickedKeys = useMemo(() => new Set(picked.map(targetKey)), [picked]);
  const toggle = useCallback((x: ForwardTarget) => {
    setPicked((prev) => {
      if (prev.some((p) => targetKey(p) === targetKey(x))) return prev.filter((p) => targetKey(p) !== targetKey(x));
      if (prev.length >= MAX_FORWARD_TARGETS) return prev;
      return [...prev, x];
    });
  }, []);
  return { picked, setPicked, pickedKeys, toggle, atLimit: picked.length >= MAX_FORWARD_TARGETS };
}

export async function forwardToTarget(target: ForwardTarget, payload: ForwardPayload, userId: string): Promise<void> {
  const attachments: ChatAttachmentLike[] = [];
  for (const att of payload.attachments) {
    if (isAudioAttachment(att)) continue;
    if (att.path) {
      const copy = await copyChatAttachmentForThread(att.path, userId, target.id);
      attachments.push({ ...att, path: copy.path, url: copy.url });
    } else if (att.url) {
      attachments.push({ ...att });
    }
  }
  const body = payload.body.trim();
  const contentData: Record<string, unknown> = { forwarded: true };
  if (attachments.length > 0) contentData.attachments = attachments;
  const messageType = attachments.length > 0 ? 'attachment' : 'text';
  if (!body && attachments.length === 0) throw new Error('empty forward');
  if (target.kind === 'dm') await sendChatMessage(target.id, body, { messageType, contentData });
  else await sendGroupMessage(target.id, body, { messageType, contentData });
}

export async function forwardToTargets(targets: ForwardTarget[], payload: ForwardPayload, userId: string): Promise<{ sent: ForwardTarget[]; failed: ForwardTarget[] }> {
  const result = { sent: [] as ForwardTarget[], failed: [] as ForwardTarget[] };
  for (const target of targets.slice(0, MAX_FORWARD_TARGETS)) {
    try {
      await forwardToTarget(target, payload, userId);
      result.sent.push(target);
    } catch {
      notifyError('screens.messages.forwardFailedFor', undefined, { name: target.name });
      result.failed.push(target);
    }
  }
  return result;
}

/** Time-limited links to the message's files, for sharing outside the app. */
export async function createShareLinks(attachments: ChatAttachmentLike[]): Promise<string[]> {
  const links: string[] = [];
  for (const att of attachments) {
    if (isAudioAttachment(att)) continue;
    const link = att.path ? await getSignedAttachmentUrl(att.path, FORWARD_SHARE_LINK_TTL_S) : att.url;
    if (link) links.push(link);
  }
  return links;
}
