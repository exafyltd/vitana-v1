import React, { useContext, useEffect, useRef, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { clearChatCache } from "@/hooks/chatPersistCache";
import { stopAndReset as stopSoundscape } from "@/audio/SoundscapeAudioManager";
import { QueryClient } from "@tanstack/react-query";
import { AuthContext } from "./AuthContext";
import type { AuthContextValue } from "./AuthContext";

/**
 * Clear all ORB-related localStorage keys to prevent cross-account leakage.
 * Called on sign-out and when the authenticated user changes.
 */
function clearOrbSessionState() {
  const orbKeys = [
    'orb_conversation_id',
    'vitana.authToken',
    'vitana.userId',
  ];
  // Also clear any user-scoped orb conversation keys
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('orb_conversation_id') || key.startsWith('orb_') || key.startsWith('vitana.auth') || key.startsWith('vitana.user'))) {
      localStorage.removeItem(key);
    }
  }
  orbKeys.forEach(k => localStorage.removeItem(k));
  console.log('[AuthProvider] Cleared ORB session state');
}

// Legacy syncOrbAuth removed — ORB lifecycle is now managed solely by useOrbVoiceWidget hook

/**
 * BOOTSTRAP-HISTORY-AWARE-TIMELINE: record auth events on the user timeline.
 * Fire-and-forget — never blocks auth flow.
 */
function logAuthActivity(activityType: 'auth.login' | 'auth.logout' | 'auth.signup', userId: string, data: Record<string, unknown> = {}) {
  if (!userId) return;
  supabase.from('user_activity_log').insert({
    user_id: userId,
    activity_type: activityType,
    activity_data: { method: 'supabase', ...data },
    context_data: { surface: 'vitanaland' },
    session_id: sessionStorage.getItem('vitana_session_id') || null,
  }).then(({ error }) => {
    if (error) console.warn(`[AuthActivity] ${activityType} log failed:`, error.message);
  });
}

function isFreshSignup(user: User | null): boolean {
  if (!user?.created_at) return false;
  const createdAt = new Date(user.created_at).getTime();
  return Date.now() - createdAt < 60_000;
}

/**
 * Parse OAuth callback params from URL hash and query string.
 * Supports both implicit flow (hash tokens) and PKCE (code param).
 */
function detectOAuthCallback(): {
  accessToken: string | null;
  refreshToken: string | null;
  pkceCode: string | null;
} {
  const hash = window.location.hash.substring(1);
  const hashParams = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(window.location.search);

  return {
    accessToken: hashParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token'),
    pkceCode: queryParams.get('code') || hashParams.get('code'),
  };
}

function clearCallbackParams() {
  const url = window.location.pathname; // strip hash and query
  window.history.replaceState(null, '', url);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { dismiss } = useToast();
  const oauthRecoveryRan = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          // Log logout BEFORE clearing state so we still have the prior user_id.
          if (prevUserIdRef.current) {
            logAuthActivity('auth.logout', prevUserIdRef.current);
          }
          dismiss();
          clearOrbSessionState();
          // Clear cached role so next login doesn't inherit stale role
          const qc = (window as any).queryClient as QueryClient | undefined;
          if (qc) {
            qc.invalidateQueries({ queryKey: ['rolePref'] }).catch(() => {});
            qc.removeQueries({ queryKey: ['rolePref'] });
          }
        }

        // Detect user switch and clear stale ORB state + role cache
        const newUserId = session?.user?.id ?? null;
        const priorUserId = prevUserIdRef.current; // captured before the update below
        if (prevUserIdRef.current && newUserId && prevUserIdRef.current !== newUserId) {
          console.log('[AuthProvider] User changed, clearing ORB state + role cache', prevUserIdRef.current, '→', newUserId);
          clearOrbSessionState();
          // Invalidate cached role preference so the new user gets their own role, not the previous user's
          const qc = (window as any).queryClient as QueryClient | undefined;
          if (qc) {
            qc.invalidateQueries({ queryKey: ['rolePref'] }).catch(() => {});
          }
        }
        prevUserIdRef.current = newUserId;

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Invalidate any stale global-threads cache on sign-in / token refresh
        // so the Messages page's useGlobalMessages hook refetches fresh data
        // when it next mounts. We intentionally do NOT prefetch here: the
        // prefetch helper used a thinner fetch path (no fetchDirectFromChatMessages
        // fallback) which cached a [Vitana-bot-only] result when the gateway
        // cold-started during OAuth, leaving the user with an empty inbox until
        // a manual refresh.
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          const userId = session.user.id;
          const qc = (window as any).queryClient as QueryClient | undefined;
          if (qc) {
            qc.invalidateQueries({ queryKey: ['global-threads', userId] }).catch(() => {});
          }

          // BOOTSTRAP-HISTORY-AWARE-TIMELINE: log auth event only on genuine
          // SIGNED_IN (a user change), not TOKEN_REFRESHED (every ~1h).
          if (event === 'SIGNED_IN' && priorUserId !== userId) {
            const type = isFreshSignup(session.user) ? 'auth.signup' : 'auth.login';
            logAuthActivity(type, userId, {
              provider: session.user.app_metadata?.provider || 'email',
            });
          }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);

      // No active session — purge any stale ORB auth to prevent
      // the external widget from using a previous user's identity
      if (!existingSession) {
        const staleOrbToken = localStorage.getItem('vitana.authToken');
        if (staleOrbToken) {
          console.log('[AuthProvider] No session but stale ORB token found — clearing');
          clearOrbSessionState();
        }
      }

      // If session already found, no need for OAuth recovery
      if (existingSession || oauthRecoveryRan.current) return;
      oauthRecoveryRan.current = true;

      // --- OAuth callback recovery for iPad/WebView ---
      const { accessToken, refreshToken, pkceCode } = detectOAuthCallback();
      const hasCallback = (accessToken && refreshToken) || pkceCode;
      if (!hasCallback) return;

      console.debug('[AuthProvider] OAuth callback detected, attempting manual recovery');

      (async () => {
        try {
          let recovered = false;

          // 1. Try PKCE code exchange first (if code present)
          if (pkceCode) {
            console.debug('[AuthProvider] Attempting PKCE code exchange');
            const { data, error } = await supabase.auth.exchangeCodeForSession(pkceCode);
            if (!error && data.session) {
              setSession(data.session);
              setUser(data.session.user);
              clearCallbackParams();
              console.debug('[AuthProvider] PKCE code exchange succeeded');
              recovered = true;
            } else {
              console.warn('[AuthProvider] PKCE exchange failed:', error?.message);
            }
          }

          // 2. Try implicit hash tokens
          if (!recovered && accessToken && refreshToken) {
            console.debug('[AuthProvider] Attempting setSession with hash tokens');
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!error && data.session) {
              setSession(data.session);
              setUser(data.session.user);
              clearCallbackParams();
              console.debug('[AuthProvider] setSession with hash tokens succeeded');
              recovered = true;
            } else {
              console.warn('[AuthProvider] setSession failed:', error?.message);
            }
          }

          // 3. Fallback: refreshSession + getSession
          if (!recovered) {
            console.debug('[AuthProvider] Falling back to refreshSession');
            await supabase.auth.refreshSession();
            const { data: { session: fallbackSession } } = await supabase.auth.getSession();
            if (fallbackSession) {
              setSession(fallbackSession);
              setUser(fallbackSession.user);
              clearCallbackParams();
              console.debug('[AuthProvider] refreshSession fallback succeeded');
            } else {
              console.warn('[AuthProvider] All OAuth recovery methods failed');
            }
          }
        } catch (err) {
          console.error('[AuthProvider] OAuth recovery error:', err);
        }
      })();
    });

    // VTID-AUTH-GUARD: Active session health monitor.
    // supabase.auth.getSession() returns the CACHED session from memory /
    // localStorage — it does NOT verify the token against the server.
    // The autoRefreshToken timer can be suspended in the Appilix WebView or
    // backgrounded browser tabs, so the cached session looks valid while
    // the JWT is actually expired on the backend.
    //
    // Goal: the app must stay logged in across inactivity / backgrounding and
    // only ever return the user to the login screen when they explicitly log
    // out OR their session is genuinely dead (refresh token revoked/expired).
    //
    // Every 30s (and when the app returns to the foreground) we read the
    // cached session's expires_at. If the access token is expired (or expiring
    // within 60s) we force an explicit refreshSession().
    //
    // CRITICAL: a refresh can fail for two very different reasons:
    //   1. Transient — no network yet (mobile radio still reconnecting after
    //      wake-from-background), a 5xx, or a timeout. These are NOT a reason
    //      to log the user out; connectivity will return and the next attempt
    //      succeeds. The old code signed out on ANY failure, which is exactly
    //      why the app appeared to "close itself" after inactivity.
    //   2. Definitive — the server says the refresh token is invalid / not
    //      found / already used / revoked. Only THEN is the session truly dead
    //      and we sign out → AuthGuard redirects to login.

    // Is this refresh error a definitive "your session is dead" response from
    // the auth server (vs. a transient network / server hiccup we can retry)?
    const isDefinitiveAuthFailure = (error: unknown): boolean => {
      if (!error || typeof error !== 'object') return false;
      const err = error as { name?: string; status?: number; code?: string; message?: string };
      // supabase-js wraps network/5xx failures in AuthRetryableFetchError —
      // those are always retryable, never a reason to sign out.
      if (err.name === 'AuthRetryableFetchError') return false;
      const code = (err.code || '').toLowerCase();
      const message = (err.message || '').toLowerCase();
      // Explicit refresh-token-dead signals from GoTrue.
      if (
        code.includes('refresh_token_not_found') ||
        code.includes('refresh_token_already_used') ||
        code.includes('session_not_found') ||
        message.includes('invalid refresh token') ||
        message.includes('refresh token not found') ||
        message.includes('already used')
      ) {
        return true;
      }
      // A 4xx (but not 429 rate-limit, which is transient) from the auth
      // server is a definitive client-side rejection of the credentials.
      if (typeof err.status === 'number' && err.status >= 400 && err.status < 500 && err.status !== 429) {
        return true;
      }
      // Anything else (no status, network throw, timeout, 5xx) → transient.
      return false;
    };

    const isRefreshingRef = { current: false };

    const checkSession = async () => {
      // Only check if we think we have a logged-in user
      if (!prevUserIdRef.current) return;
      // Avoid overlapping refreshes (poll + visibilitychange can race).
      if (isRefreshingRef.current) return;

      let cached;
      try {
        ({ data: { session: cached } } = await supabase.auth.getSession());
      } catch (err) {
        // getSession reads local storage; a throw here is transient — keep the
        // session and try again on the next tick rather than logging out.
        console.warn('[AuthProvider] getSession threw — will retry, keeping session:', err);
        return;
      }

      if (!cached) {
        // No cached session. This means storage was cleared (explicit logout
        // elsewhere, or a different tab signed out). There is nothing to
        // refresh; just make sure our React state reflects the signed-out
        // status — do NOT call signOut() (it would race the real sign-out and
        // can fire spurious SIGNED_OUT side effects).
        return;
      }

      // Check if the access token has expired or will expire within 60s.
      const expiresAt = cached.expires_at; // Unix seconds
      if (!expiresAt || expiresAt * 1000 - Date.now() >= 60_000) return;

      console.log('[AuthProvider] Token expired or expiring soon — refreshing');
      isRefreshingRef.current = true;
      try {
        // Retry transient failures with backoff before giving up. We do NOT
        // sign out on transient failure — the session stays and the next
        // poll / foreground will retry. We only sign out on a definitive
        // "refresh token dead" response.
        const backoffMs = [0, 2_000, 5_000];
        for (let attempt = 0; attempt < backoffMs.length; attempt++) {
          if (backoffMs[attempt] > 0) {
            await new Promise((r) => setTimeout(r, backoffMs[attempt]));
          }
          let refreshed = null;
          let error: unknown = null;
          try {
            const res = await supabase.auth.refreshSession();
            refreshed = res.data.session;
            error = res.error;
          } catch (thrown) {
            // Network throw (AuthRetryableFetchError / fetch failure).
            error = thrown;
          }

          if (refreshed) {
            // Refresh succeeded — sync React state with fresh tokens.
            setSession(refreshed);
            setUser(refreshed.user);
            return;
          }

          if (isDefinitiveAuthFailure(error)) {
            // Session is genuinely dead — this is the only path that logs out.
            console.warn('[AuthProvider] Refresh token invalid — signing out:', (error as { message?: string })?.message);
            supabase.auth.signOut();
            return;
          }

          // Transient failure — log and retry (or give up this round, keeping
          // the session so a later check can recover it).
          console.warn(
            `[AuthProvider] Token refresh transient failure (attempt ${attempt + 1}/${backoffMs.length}) — keeping session, will retry:`,
            (error as { message?: string })?.message,
          );
        }
      } finally {
        isRefreshingRef.current = false;
      }
    };

    // Poll every 30 seconds
    const sessionCheckInterval = setInterval(checkSession, 30_000);

    // Also check (and resume auto-refresh) when the app returns to foreground.
    // In a WebView the visibility/focus events that drive supabase-js's own
    // auto-refresh can be unreliable, so we nudge it explicitly.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.startAutoRefresh().catch(() => {});
        checkSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('[AuthProvider] Signing out user');
      dismiss();
      stopSoundscape();
      clearChatCache();
      clearOrbSessionState();

      // ORB widget lifecycle is now managed solely by useOrbVoiceWidget hook

      // scope: 'local' clears the client session synchronously without a
      // round-trip to Supabase Auth's /logout endpoint. iOS WKWebView (Appilix)
      // is much slower than Android Chromium on that round-trip, so the
      // default 'global' revoke made logout feel like 5–6s on iPhone.
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.error('[AuthProvider] Sign out error:', error);
      } else {
        console.log('[AuthProvider] Sign out successful');
      }
    } catch (error: any) {
      console.error('[AuthProvider] Sign out exception:', error);
    }
  };

  const value: AuthContextValue = {
    user,
    session,
    loading,
    signOut,
  };

  // Appilix native push targeting. The iOS/Android wrapper records its
  // user_identity at page-load time (reading the cookie via the inline
  // bootstrap in index.html) and does NOT update on SPA route changes or
  // React state updates. So when a user signs in (or a different user
  // signs in on the same device), the wrapper keeps its previously-baked
  // identity until the page hard-reloads.
  //
  // Mechanism:
  //   1. Always sync window.appilix_push_notification_user_identity and the
  //      appilix_push_notification_user_identity cookie with the active
  //      Supabase user.id (cleared on sign-out).
  //   2. Track the last user.id we forced a reload for in localStorage.
  //      When the active user.id differs from that marker, force one
  //      window.location.reload() so the inline bootstrap in index.html
  //      re-runs and the Appilix wrapper picks up the new identity at the
  //      next page-load read.
  //
  // Without this, the backend's targeted pushes route to whichever
  // identity the wrapper baked in first (e.g. a previous sign-in's user)
  // and never reach the currently-signed-in user. Verified by observing
  // identical FCM tokens in user_device_tokens for two different users:
  // the iPhone was registered with Appilix under the first signed-in
  // user's id and stayed there.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Wait for the initial auth bootstrap to complete before deciding
    // whether the user is signed out vs. just hydrating. Otherwise the
    // initial null user (loading state) would clear the registration
    // marker and trap logged-in users in a reload loop on every refresh.
    if (loading) return;

    const userId = user?.id ?? '';
    const REGISTERED_KEY = 'appilix_registered_identity_v1';

    (window as any).appilix_push_notification_user_identity = userId;

    if (userId) {
      document.cookie = `appilix_push_notification_user_identity=${userId}; path=/; max-age=31536000; SameSite=Lax; Secure`;
    } else {
      document.cookie = 'appilix_push_notification_user_identity=; path=/; max-age=0; SameSite=Lax; Secure';
      localStorage.removeItem(REGISTERED_KEY);
      return;
    }

    const appilix = (window as any).appilix;
    if (appilix?.postMessage) {
      try {
        appilix.postMessage(JSON.stringify({
          type: 'firebase_record_user_identity',
          props: { user_identity: userId },
        }));
      } catch (err) {
        console.warn('[AuthProvider] Appilix postMessage failed:', err);
      }
    }

    const lastRegistered = localStorage.getItem(REGISTERED_KEY);
    if (lastRegistered !== userId) {
      localStorage.setItem(REGISTERED_KEY, userId);
      console.log('[AuthProvider] Appilix identity changed, reloading to re-register with native shell');
      window.location.reload();
    }
  }, [user?.id, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
