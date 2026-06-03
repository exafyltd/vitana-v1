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

/**
 * True when an error means the `live_stream_subscribers` relation isn't there
 * yet (migration not applied in this environment). PostgREST reports a missing
 * table as `PGRST205` ("Could not find the table … in the schema cache"); a
 * Postgres-level undefined_table is `42P01`. The reads already fail soft on
 * this; the writes must too, otherwise tapping "Notify me" in a not-yet-migrated
 * environment throws and shows a misleading "Could not update reminder" toast.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isMissingRelation(error: any): boolean {
  if (!error) return false;
  const code = error.code as string | undefined;
  if (code === "PGRST205" || code === "42P01") return true;
  const msg = String(error.message ?? "");
  return /schema cache|find the table|does not exist/i.test(msg);
}

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
      if (!error || error.code === "23505") return;
      // Table not migrated yet → fail soft (matches the read hooks) so the
      // caller can still set the personal reminder instead of erroring out.
      if (isMissingRelation(error)) {
        console.warn("[streamSubs] subscribe skipped (table missing):", error.message);
        return;
      }
      throw error;
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
      if (!error) return;
      // Table not migrated yet → nothing to remove; fail soft like the reads.
      if (isMissingRelation(error)) {
        console.warn("[streamSubs] unsubscribe skipped (table missing):", error.message);
        return;
      }
      throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE_KEY });
      qc.invalidateQueries({ queryKey: COUNTS_KEY });
    },
  });
}
