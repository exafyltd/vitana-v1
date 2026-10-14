/**
 * VTID-05170 — Life Timeline P4: one infinite query for the timeline, one for
 * the Vitana Index spotlight (replaces the 9 queries / 18 realtime channels
 * the old screen opened). Mutations invalidate both.
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteTimelineItem,
  fetchTimelineItem,
  fetchTimelinePage,
  fetchTimelineSpotlight,
  setTimelineHiddenFromAi,
  type TimelineFilters,
  type TimelinePage,
} from "@/lib/timeline-api";

export const timelineKeys = {
  all: ["timeline"] as const,
  list: (f: TimelineFilters) => ["timeline", "list", f.pillar ?? null, f.category ?? null, f.q ?? null, f.from ?? null, f.to ?? null] as const,
  spotlight: ["timeline", "spotlight"] as const,
  item: (id: string) => ["timeline", "item", id] as const,
};

export function useTimeline(filters: TimelineFilters) {
  const query = useInfiniteQuery<TimelinePage>({
    queryKey: timelineKeys.list(filters),
    queryFn: ({ pageParam }) => fetchTimelinePage(filters, pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const seen = new Set<string>();
  const items = (query.data?.pages ?? [])
    .flatMap((p) => p.items)
    .filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  return { ...query, items };
}

export function useTimelineSpotlight() {
  return useQuery({
    queryKey: timelineKeys.spotlight,
    queryFn: fetchTimelineSpotlight,
    staleTime: 60_000,
  });
}

export function useTimelineItem(id: string | null) {
  return useQuery({
    queryKey: timelineKeys.item(id ?? ""),
    queryFn: () => fetchTimelineItem(id as string),
    enabled: !!id,
  });
}

export function useTimelineActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: timelineKeys.all });
  const hide = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) => setTimelineHiddenFromAi(id, hidden),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteTimelineItem(id),
    onSuccess: invalidate,
  });
  return { hide, remove };
}
