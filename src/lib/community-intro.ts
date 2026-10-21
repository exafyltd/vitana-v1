/**
 * VTID-05206 — "Introduce me to the community": may the News Feed show a
 * "new member" card for me during my first 7 days?
 *
 * Stored on the member's own global_community_profiles row
 * (community_intro_opt_in), written through the existing owner RLS policy.
 * Default true for members who register after the migration, false for
 * members who existed before it (owner decision D1). The News Feed sources new
 * members with `.eq(COMMUNITY_INTRO_COLUMN, true)` (useAllNewsFeed, useNewsFeed).
 */
import { supabase } from "@/integrations/supabase/client";

export const COMMUNITY_INTRO_COLUMN = "community_intro_opt_in" as const;

/** The member's current choice. A missing row reads as not introduced. */
export async function getCommunityIntroOptIn(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("global_community_profiles")
    .select(COMMUNITY_INTRO_COLUMN)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as { community_intro_opt_in?: boolean } | null)?.community_intro_opt_in === true;
}

/** Save the member's choice on their own row (the row exists from signup). */
export async function setCommunityIntroOptIn(userId: string, value: boolean): Promise<void> {
  const { error } = await supabase
    .from("global_community_profiles")
    .update({ [COMMUNITY_INTRO_COLUMN]: value })
    .eq("user_id", userId);
  if (error) throw error;
}
