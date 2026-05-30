/**
 * "Notify me" for scheduled live sessions.
 *
 * Backed by the `live_stream_subscribers` table (see migration
 * 20260530120000_live_stream_subscribers.sql). Replaces the old throwaway
 * local-state toggle in LiveRooms.tsx, so:
 *   - tapping "Notify me" persists across refresh / devices, and
 *   - the card can show a real "X will join" counter.
 *
 * The table + RPC are added in a migration that ships with this change; until
 * Supabase types are regenerated they aren't in `Database`, hence the narrow
 * `as any` casts below. Reads fail soft (return empty) so a not-yet-migrated
 * environment never white-screens the Live Rooms page.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";

const MINE_KEY = ["stream-subscriptions", "mine"];
const COUNTS_KEY = ["stream-subscriptions", "counts"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any; // new table/rpc not yet in generated Database types

/** Set of stream ids the current user has tapped "Notify me" on. */
export function useMyStreamSubscriptions() {
  const { user } = useAuth();
  return useQuery<Set<string>>({
    queryKey: [...MINE_KEY, user?.id ?? null],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await sb
        .from("live_stream_subscribers")
        .select("stream_id")
        .eq("user_id", user!.id);
      if (error) {
        console.warn("[streamSubs] load mine failed:", error.message);
        return new Set<string>();
      }
      return new Set<string>((data ?? []).map((r: { stream_id: string }) => r.stream_id));
    },
  });
}

/** Subscriber counts keyed by stream id, for the "X will join" chip. */
export function useStreamSubscriberCounts(streamIds: string[]) {
  const sorted = [...streamIds].sort();
  return useQuery<Record<string, number>>({
    queryKey: [...COUNTS_KEY, sorted.join(",")],
    enabled: sorted.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await sb.rpc("get_live_stream_subscriber_counts", {
        stream_ids: sorted,
      });
      if (error) {
        console.warn("[streamSubs] counts failed:", error.message);
        return {};
      }
      const out: Record<string, number> = {};
      for (const row of (data ?? []) as { stream_id: string; subscriber_count: number }[]) {
        out[row.stream_id] = Number(row.subscriber_count);
      }
      return out;
    },
  });
}

export function useSubscribeToStream() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (streamId: string) => {
      const { error } = await sb
        .from("live_stream_subscribers")
        .insert({ stream_id: streamId, user_id: user!.id });
      // 23505 = unique violation → already subscribed; treat as success (idempotent)
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE_KEY });
      qc.invalidateQueries({ queryKey: COUNTS_KEY });
    },
  });
}

export function useUnsubscribeFromStream() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (streamId: string) => {
      const { error } = await sb
        .from("live_stream_subscribers")
        .delete()
        .eq("stream_id", streamId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE_KEY });
      qc.invalidateQueries({ queryKey: COUNTS_KEY });
    },
  });
}
