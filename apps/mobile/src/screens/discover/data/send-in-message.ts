/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — the data behind
 * the product drawer's "Send in message" button, native twin of
 * `src/components/messages/forwardTargets.ts` + `SendInMessageSheet.tsx`
 * `sendSharedToTargets` (class B: the web chat API and Supabase client):
 *
 *  - targets: the member's direct chats (`GET /chat/conversations`, the peer's
 *    name from `global_community_profiles` then `profiles`, never the Vitana
 *    bot, at most 30 — `dmTargets`) followed by the groups (`GET /chat/groups/`);
 *    filtered by the search text; at most 5 picked (MAX_FORWARD_TARGETS);
 *  - send: one `shared_content` message per target carrying only
 *    `{ kind, id }` plus the caption (≤ 1000), `POST /chat/send`
 *    `{ receiver_id, content, message_type, content_data, client_message_id }`
 *    or `POST /chat/groups/:id/send`; the same client id is reused on a retry;
 *    one failure never stops the rest, `share_not_allowed` stops them all.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { getSupabase } from '../../../auth/client';
import { useAuth } from '../../../auth/AuthProvider';
import { notifyError } from '../../../ports/discover';
import { chatJson } from './client';

export const MAX_FORWARD_TARGETS = 5;
export const SHARED_CAPTION_MAX = 1000;
const MAX_CHATS = 30;
/** src/lib/vitanaBotIdentity.ts VITANA_BOT_USER_ID default. */
export const VITANA_BOT_USER_ID = '00000000-0000-0000-0000-000000000001';

export type ForwardTarget = { kind: 'dm' | 'group'; id: string; name: string };
export type SharedRef = { kind: 'product' | 'post' | 'event' | 'profile'; id: string };

export const targetKey = (x: ForwardTarget) => `${x.kind}:${x.id}`;

async function fetchDmTargets(): Promise<ForwardTarget[]> {
  const json = await chatJson<{ data?: Array<{ peer_id: string }> }>('/conversations');
  const peers = (json.data ?? []).map((c) => c.peer_id).filter((id) => !!id && id !== VITANA_BOT_USER_ID);
  if (peers.length === 0) return [];
  const db = getSupabase() as any;
  const [{ data: globalProfiles }, { data: mainProfiles }] = await Promise.all([
    db.from('global_community_profiles').select('user_id, display_name, avatar_url').in('user_id', peers),
    db.from('profiles').select('user_id, display_name, full_name, avatar_url').in('user_id', peers),
  ]);
  const out: ForwardTarget[] = [];
  for (const id of peers) {
    const gp = (globalProfiles ?? []).find((p: any) => p.user_id === id);
    const mp = (mainProfiles ?? []).find((p: any) => p.user_id === id);
    out.push({ kind: 'dm', id, name: gp?.display_name || mp?.display_name || mp?.full_name || '' });
    if (out.length >= MAX_CHATS) break;
  }
  return out;
}

async function fetchGroupTargets(): Promise<ForwardTarget[]> {
  const json = await chatJson<{ data?: Array<{ id: string; name: string }> }>('/groups/');
  return (json.data ?? []).map((g) => ({ kind: 'group' as const, id: g.id, name: g.name }));
}

export function useChatTargets(open: boolean, query: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const threads = useQuery({ queryKey: ['global-threads', user?.id], queryFn: fetchDmTargets, enabled: open && !!user?.id, staleTime: 60_000 });
  const groups = useQuery({ queryKey: ['chat-groups', user?.id], queryFn: fetchGroupTargets, enabled: open && !!user?.id, staleTime: 2 * 60_000 });
  const targets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [...(threads.data ?? []), ...(groups.data ?? [])];
    return q ? all.filter((x) => x.name.toLowerCase().includes(q)) : all;
  }, [threads.data, groups.data, query]);
  const refreshTargets = useCallback(() => {
    if (!user?.id) return;
    void qc.invalidateQueries({ queryKey: ['global-threads', user.id] });
    void qc.invalidateQueries({ queryKey: ['chat-groups', user.id] });
  }, [qc, user?.id]);
  return { targets, loading: threads.isLoading || groups.isLoading, refreshTargets };
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

export type SendIds = Map<string, string>;

export async function sendSharedToTarget(target: ForwardTarget, item: SharedRef, caption: string, ids?: SendIds): Promise<void> {
  const key = targetKey(target);
  const clientMessageId = ids?.get(key) ?? randomUUID();
  if (ids) ids.set(key, clientMessageId);
  const content = caption.trim().slice(0, SHARED_CAPTION_MAX);
  const contentData = { kind: item.kind, id: item.id };
  if (target.kind === 'dm') {
    await chatJson('/send', {
      method: 'POST',
      body: JSON.stringify({ receiver_id: target.id, content, message_type: 'shared_content', content_data: contentData, client_message_id: clientMessageId }),
    });
  } else {
    await chatJson(`/groups/${target.id}/send`, {
      method: 'POST',
      body: JSON.stringify({ content, message_type: 'shared_content', content_data: contentData, client_message_id: clientMessageId }),
    });
  }
  ids?.delete(key);
}

export async function sendSharedToTargets(targets: ForwardTarget[], item: SharedRef, caption: string, ids?: SendIds): Promise<{ sent: ForwardTarget[]; failed: ForwardTarget[] }> {
  const result = { sent: [] as ForwardTarget[], failed: [] as ForwardTarget[] };
  const list = targets.slice(0, MAX_FORWARD_TARGETS);
  for (const target of list) {
    try {
      await sendSharedToTarget(target, item, caption, ids);
      result.sent.push(target);
    } catch (err) {
      const code = String((err as Error)?.message || '');
      if (code === 'share_not_allowed') {
        notifyError('inbox.shared.notAllowed');
        result.failed.push(...list.slice(list.indexOf(target)));
        return result;
      }
      notifyError('screens.messages.forwardFailedFor', undefined, { name: target.name });
      result.failed.push(target);
    }
  }
  return result;
}
