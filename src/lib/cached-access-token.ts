/**
 * The signed-in user's access token without waiting on the auth lock (VTID-04532).
 *
 * `supabase.auth.getSession()` takes the browser-wide auth lock. Right after a
 * screen change the app fires dozens of requests that all take it, and a call
 * queues behind every one of them — measured on staging, the calendar waited
 * 4–8 s before it even sent its request, with single lock waits of up to 2.5 s.
 *
 * Here the token comes from the session supabase already announces through
 * onAuthStateChange (initial session, sign-in, refresh, sign-out). Only when
 * nothing is known yet, or the token is within a minute of expiring, does it
 * fall back to getSession(), which refreshes it.
 */
import { supabase } from "@/integrations/supabase/client";

const EXPIRY_MARGIN_S = 60;

let cached: { token: string; expiresAt: number | null } | null = null;
let subscribed = false;

function subscribe(): void {
  if (subscribed) return;
  subscribed = true;
  try {
    supabase.auth.onAuthStateChange((_event, session) => {
      cached = session?.access_token
        ? { token: session.access_token, expiresAt: session.expires_at ?? null }
        : null;
    });
  } catch {
    // No listener available (tests, SSR): every call falls back to getSession().
  }
}

subscribe();

function isFresh(entry: { expiresAt: number | null }, nowS: number): boolean {
  return entry.expiresAt === null || entry.expiresAt - EXPIRY_MARGIN_S > nowS;
}

export async function getAccessToken(): Promise<string | null> {
  if (cached && isFresh(cached, Date.now() / 1000)) return cached.token;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  cached = session?.access_token ? { token: session.access_token, expiresAt: session.expires_at ?? null } : null;
  return cached?.token ?? null;
}

/** Test hook: forget the cached token. */
export function __resetAccessTokenCache(): void {
  cached = null;
}
