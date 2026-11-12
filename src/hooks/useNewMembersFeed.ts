/**
 * VTID-05478 — the "new member" card listing, read through the gateway.
 *
 * The News feed (useAllNewsFeed) and the Community tab (useNewsFeed) used to
 * read global_community_profiles straight from the browser, which cannot see
 * the service-side allowlists (service_bot_accounts, notification_test_actors),
 * so a test or bot account could be listed. GET /api/v1/community/new-members
 * (VTID-05477) returns the same rows minus every excluded account and the caller.
 *
 * Fail safe: on any non-200, network error, timeout or missing token this
 * returns an empty list so no card is shown. It never falls back to the direct
 * table query.
 */
import { supabase } from "@/integrations/supabase/client";
import { GATEWAY_API_URL } from "@/lib/gateway-base";

export interface NewMemberRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

const MAX_NEW_MEMBERS = 5;

async function resolveToken(token?: string | null): Promise<string | null> {
  if (token) return token;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function fetchNewMembers(token?: string | null): Promise<NewMemberRow[]> {
  try {
    const bearer = await resolveToken(token);
    if (!bearer) return [];
    const res = await fetch(`${GATEWAY_API_URL}/community/new-members?limit=${MAX_NEW_MEMBERS}`, {
      headers: { Authorization: `Bearer ${bearer}` },
      // An optional card must never hold the whole feed: abort lands in the catch.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error("[useNewMembersFeed] new-members request failed:", res.status);
      return [];
    }
    const json = await res.json();
    if (!json?.ok || !Array.isArray(json.members)) return [];
    return (json.members as NewMemberRow[]).filter((m) => !!m?.user_id);
  } catch (err) {
    console.error("[useNewMembersFeed] new-members request error:", err instanceof Error ? err.message : err);
    return [];
  }
}
