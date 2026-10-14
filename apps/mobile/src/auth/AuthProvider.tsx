/**
 * VTID-05186 (N3, plan change 9) — native AuthProvider, same context shape as
 * the web `useAuth()` (`session`, `user`, `loading`, `signOut`).
 *
 * - "loading never hangs": the VTID-03652 backstop, same 10 s constant as
 *   src/context/AuthProvider.tsx (`authBootstrapTimeout`, pinned in
 *   scripts/native/shell-pins.json).
 * - AppState active/background → startAutoRefresh / stopAutoRefresh.
 * - signOut({ scope: 'local' }), then the React Query cache, the persisted
 *   query cache, the active org and the tenant slug are cleared.
 * - An unset config is not an error here: `configMissing` names the keys and
 *   the root renders the ConfigMissing screen (plan change 15).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { ConfigMissingError } from '../ports/env';
import { clearSignedOutState } from '../identity/device-storage';
import { getSupabase } from './client';

/** src/context/AuthProvider.tsx `authBootstrapTimeout` (VTID-03652). */
export const AUTH_BOOTSTRAP_TIMEOUT_MS = 10_000;

export type AuthValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** Config keys that are unset (names only); null when the client could be built. */
  configMissing: readonly string[] | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

type State = { session: Session | null; loading: boolean; configMissing: readonly string[] | null };

function resolveClient(client?: SupabaseClient): { client: SupabaseClient | null; missing: readonly string[] | null } {
  if (client) return { client, missing: null };
  try {
    return { client: getSupabase(), missing: null };
  } catch (e) {
    if (e instanceof ConfigMissingError) return { client: null, missing: e.keys };
    throw e;
  }
}

export function AuthProvider({ children, client: injected }: { children: ReactNode; client?: SupabaseClient }) {
  const queryClient = useQueryClient();
  const [{ client, missing }] = useState(() => resolveClient(injected));
  const [state, setState] = useState<State>(() => ({ session: null, loading: !!client, configMissing: missing }));

  useEffect(() => {
    if (!client) return undefined;
    let resolved = false;
    let active = true;
    const settle = (session: Session | null) => {
      resolved = true;
      if (active) setState((s) => ({ ...s, session, loading: false }));
    };
    const timer = setTimeout(() => {
      if (!resolved && active) setState((s) => ({ ...s, loading: false }));
    }, AUTH_BOOTSTRAP_TIMEOUT_MS);

    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') queryClient.removeQueries({ queryKey: ['rolePref'] });
      settle(session);
    });
    client.auth
      .getSession()
      .then(({ data: d }) => settle(d.session))
      .catch(() => undefined);

    const refresh = (status: string) => {
      if (status === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const sub = AppState.addEventListener('change', refresh);

    return () => {
      active = false;
      clearTimeout(timer);
      data.subscription.unsubscribe();
      sub.remove();
    };
  }, [client, queryClient]);

  const signOut = useCallback(async () => {
    if (client) {
      try {
        await client.auth.signOut({ scope: 'local' });
      } catch {
        /* the local session is cleared below either way */
      }
    }
    queryClient.clear();
    await clearSignedOutState();
    setState((s) => ({ ...s, session: null }));
  }, [client, queryClient]);

  const value = useMemo<AuthValue>(
    () => ({ session: state.session, user: state.session?.user ?? null, loading: state.loading, configMissing: state.configMissing, signOut }),
    [state, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For hooks that also run outside the provider (tests, the ORB slot). */
export function useAuthSafe(): AuthValue | null {
  return useContext(AuthContext);
}
