import React, { useContext, useEffect, useRef, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { clearChatCache } from "@/hooks/chatPersistCache";
import { prefetchInboxThreads } from "@/lib/prefetchInboxThreads";
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
          dismiss();
          clearOrbSessionState();
        }

        // Detect user switch and clear stale ORB state
        const newUserId = session?.user?.id ?? null;
        if (prevUserIdRef.current && newUserId && prevUserIdRef.current !== newUserId) {
          console.log('[AuthProvider] User changed, clearing ORB state', prevUserIdRef.current, '→', newUserId);
          clearOrbSessionState();
        }
        prevUserIdRef.current = newUserId;

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Sync ORB auth + prefetch inbox on sign-in
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          syncOrbAuth(session);

          const userId = session.user.id;
          const qc = (window as any).queryClient as QueryClient | undefined;
          if (qc) {
            qc.prefetchQuery({
              queryKey: ['global-threads', userId],
              queryFn: () => prefetchInboxThreads(userId),
              staleTime: 0,
            }).catch(() => {});
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

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      console.log('[AuthProvider] Signing out user');
      dismiss();
      stopSoundscape();
      clearChatCache();
      clearOrbSessionState();

      // ORB widget lifecycle is now managed solely by useOrbVoiceWidget hook

      const { error } = await supabase.auth.signOut();
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
