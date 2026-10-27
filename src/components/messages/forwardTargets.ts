/**
 * The member's chat targets — real direct chats and groups — for picking where
 * to send something: forwarding a message (VTID-05138) and "Send in message"
 * of a post, event, product or profile (VTID-05321). Extracted from
 * ForwardMessageSheet so both pickers use the same list, limit and selection.
 */
import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthProvider';
import { fetchGroups } from '@/hooks/useChatApi';
import { buildGlobalThreadsQueryFn } from '@/hooks/useGlobalMessages';
import { chatGroupsQueryKey } from '@/hooks/useChatGroupsAsThreads';
import { dmTargets, type InviteTarget } from '@/components/calendar/vcal/InviteToChatSheet';

export const MAX_FORWARD_TARGETS = 5;

export type ForwardTarget = InviteTarget;

export const targetKey = (x: ForwardTarget) => `${x.kind}:${x.id}`;

/** The member's DMs then groups, filtered by name; loaded only while `open`. */
export function useChatTargets(open: boolean, query: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const threadsKey = useMemo(() => ['global-threads', user?.id] as const, [user?.id]);
  const threads = useQuery({
    queryKey: threadsKey,
    queryFn: () => buildGlobalThreadsQueryFn(user!.id, queryClient, threadsKey),
    enabled: open && !!user?.id,
    staleTime: 60_000,
  });
  const groups = useQuery({
    queryKey: chatGroupsQueryKey(user?.id),
    queryFn: fetchGroups,
    enabled: open && !!user?.id,
    staleTime: 2 * 60_000,
  });

  const targets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all: ForwardTarget[] = [
      ...dmTargets(threads.data),
      ...(groups.data ?? []).map((g) => ({ kind: 'group' as const, id: g.id, name: g.name })),
    ];
    return q ? all.filter((x) => x.name.toLowerCase().includes(q)) : all;
  }, [threads.data, groups.data, query]);

  /** After a send: the chat lists show the new last message. */
  const refreshTargets = useCallback(() => {
    if (!user?.id) return;
    queryClient.invalidateQueries({ queryKey: threadsKey });
    queryClient.invalidateQueries({ queryKey: chatGroupsQueryKey(user.id) });
  }, [queryClient, threadsKey, user?.id]);

  return { userId: user?.id, targets, loading: threads.isLoading || groups.isLoading, refreshTargets };
}

/** Multi-select of up to MAX_FORWARD_TARGETS targets. */
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
