import React, { useContext, useEffect, useRef, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { clearChatCache } from "@/hooks/chatPersistCache";
import { prefetchInboxThreads } from "@/lib/prefetchInboxThreads";
import { QueryClient } from "@tanstack/react-query";
import { AuthContext } from "./AuthContext";
import type { AuthContextValue } from "./AuthContext";

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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          dismiss();
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Prefetch inbox threads immediately on sign-in so chat is ready
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          const userId = session.user.id;
          // Access QueryClient from window (set by App.tsx) to avoid hook dependency
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
      clearChatCache();
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
