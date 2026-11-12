/**
 * VTID-05475 — Community introductions are an explicit choice.
 *
 * Owner decision 2026-10-30 (supersedes VTID-05206 D1 "default ON"): nobody is
 * publicly introduced (no News Feed "new member" card, no Say Hello eligibility)
 * until they actively choose "Yes, introduce me 👋". The member's choice is
 * stored on their own global_community_profiles row: community_intro_opt_in
 * (true = introduce me) plus community_intro_choice_at (the marker that records
 * an explicit choice was made — Yes OR Not now). Written through the existing
 * owner RLS policy. The News Feed sources new members with
 * `.eq(COMMUNITY_INTRO_COLUMN, true)` (useAllNewsFeed, useNewsFeed).
 *
 * Backward compatible with the migration not yet applied (sparring R1-F1):
 * community_intro_choice_at only exists after
 * supabase/migrations/20261103120000_vtid_05475_community_intro_explicit_choice.sql
 * is applied (an owner stop, collaboration.md §7d). Until then PostgREST
 * rejects a write to the unknown column (PGRST204 / Postgres 42703); we retry
 * once writing only community_intro_opt_in, so the Settings toggle and the
 * registration buttons keep working before and after the apply. Any other error
 * is thrown, as before.
 */
import { supabase } from "@/integrations/supabase/client";

export const COMMUNITY_INTRO_COLUMN = "community_intro_opt_in" as const;
export const COMMUNITY_INTRO_CHOICE_AT_COLUMN = "community_intro_choice_at" as const;

/** A PostgREST/Postgres error naming a column the migration adds but that does
 *  not exist yet (same shape as the gateway's chat-repository.ts isMissingColumn). */
function isMissingColumnError(error: { code?: string; message?: string } | null | undefined, column: string): boolean {
  if (!error) return false;
  if (error.code !== "PGRST204" && error.code !== "42703") return false;
  return (error.message || "").includes(column);
}

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

/**
 * Record the member's explicit choice on their own row (the row exists from
 * signup). Writes both the opt-in value and the choice marker. If the marker
 * column does not exist yet (migration not applied), retries once writing only
 * community_intro_opt_in so the write still succeeds; any other error is thrown.
 */
export async function setCommunityIntroOptIn(userId: string, value: boolean): Promise<void> {
  const { error } = await supabase
    .from("global_community_profiles")
    .update({
      [COMMUNITY_INTRO_COLUMN]: value,
      [COMMUNITY_INTRO_CHOICE_AT_COLUMN]: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (!error) return;

  // Pre-migration fallback: the marker column does not exist yet — write only
  // the opt-in so the toggle and registration keep working (sparring R1-F1).
  if (isMissingColumnError(error, COMMUNITY_INTRO_CHOICE_AT_COLUMN)) {
    const { error: retryError } = await supabase
      .from("global_community_profiles")
      .update({ [COMMUNITY_INTRO_COLUMN]: value })
      .eq("user_id", userId);
    if (retryError) throw retryError;
    return;
  }

  throw error;
}
