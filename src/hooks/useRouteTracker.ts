/**
 * useRouteTracker - BOOTSTRAP-HISTORY-AWARE-TIMELINE
 *
 * Logs a page.view timeline entry whenever the authenticated user navigates.
 * Deduped: same pathname within 60s does not re-log (prevents spam from
 * hash/query changes on the same page).
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const DEDUPE_WINDOW_MS = 60_000;

// Paths that shouldn't clutter the timeline.
const SKIP_PREFIXES = [
  '/auth/',
  '/login',
  '/register',
  '/_intro/',
  '/oauth',
];

function shouldSkip(pathname: string): boolean {
  return SKIP_PREFIXES.some(p => pathname.startsWith(p));
}

export function useRouteTracker() {
  const location = useLocation();
  const lastLoggedRef = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    const pathname = location.pathname;
    if (!pathname || shouldSkip(pathname)) return;

    const now = Date.now();
    if (lastLoggedRef.current
        && lastLoggedRef.current.path === pathname
        && now - lastLoggedRef.current.at < DEDUPE_WINDOW_MS) {
      return;
    }

    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;

      const sessionId = sessionStorage.getItem('vitana_session_id') || crypto.randomUUID();
      if (!sessionStorage.getItem('vitana_session_id')) {
        sessionStorage.setItem('vitana_session_id', sessionId);
      }

      const { error } = await supabase.from('user_activity_log').insert({
        user_id: userId,
        activity_type: 'page.view',
        activity_data: {
          path: pathname,
          search: location.search || null,
        },
        context_data: { surface: 'vitanaland' },
        dedupe_key: `pv:${pathname}:${Math.floor(now / 60_000)}`,
        session_id: sessionId,
      });

      if (!error) {
        lastLoggedRef.current = { path: pathname, at: now };
      } else if (error.code !== '23505') {
        console.warn('[RouteTracker] log failed:', error.message);
      }
    })();
  }, [location.pathname, location.search]);
}
