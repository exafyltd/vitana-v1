/**
 * VTID-04995: ask the gateway what a chosen time collides with, once the
 * member stops fiddling with the pickers. Warning only — it never blocks, and
 * a failed check shows nothing. Plain effect (no query client) so the entry
 * screen still renders anywhere.
 */
import { useEffect, useState } from "react";
import { fetchCalendarConflicts, type CalendarConflict } from "@/lib/calendar-window-client";

const SETTLE_MS = 400;

export function useOverlap(
  start: Date | null,
  end: Date | null,
  role: string | null,
  excludeEventId?: string,
): CalendarConflict[] {
  const startMs = start && !Number.isNaN(start.getTime()) ? start.getTime() : null;
  const endMs = end && !Number.isNaN(end.getTime()) ? end.getTime() : null;
  const [found, setFound] = useState<CalendarConflict[]>([]);

  useEffect(() => {
    if (startMs === null || (endMs !== null && endMs <= startMs)) {
      setFound([]);
      return;
    }
    let live = true;
    const id = setTimeout(() => {
      fetchCalendarConflicts(new Date(startMs), endMs === null ? null : new Date(endMs), role, excludeEventId)
        .then((c) => live && setFound(c))
        .catch(() => live && setFound([]));
    }, SETTLE_MS);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [startMs, endMs, role, excludeEventId]);

  return found;
}
