import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * VTID-04827: record that the member saw their daily matches.
 *
 * `daily_matches.viewed_at` existed but nothing ever wrote it, so every match
 * counted as unseen: the "0 viewed" metric meant nothing and the
 * connect-people push counted matches the member had already looked at.
 *
 * Call it where match cards are actually on screen (the Matches page, the My
 * Journey preview) — not where matches are only counted. Sets viewed_at once
 * on the member's own live, unseen rows (RLS: owners may update their own
 * matches); each id is sent at most once per mount. Never blocks rendering.
 */
export async function markMatchesViewed(matchedUserIds: string[]): Promise<void> {
  if (matchedUserIds.length === 0) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("daily_matches")
    .update({ viewed_at: now })
    .eq("user_id", user.id)
    .in("matched_user_id", matchedUserIds)
    .is("viewed_at", null)
    .gt("expires_at", now);
  if (error) console.warn("[useMarkMatchesViewed] marking matches viewed failed:", error.message);
}

export function useMarkMatchesViewed(matchedUserIds: string[]): void {
  const sent = useRef(new Set<string>());
  const key = matchedUserIds.join(",");
  useEffect(() => {
    const fresh = matchedUserIds.filter((id) => !sent.current.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => sent.current.add(id));
    void markMatchesViewed(fresh).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
