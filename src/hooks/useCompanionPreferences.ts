/**
 * VTID-05100 (Companion Messages, Phase 2) — the member's "Vitana messages"
 * preferences, read and written through the gateway:
 *
 *   GET   /api/v1/companion/preferences  → { ok, preferences }
 *   PATCH /api/v1/companion/preferences  (any subset of the booleans) → same
 *
 * The gateway owns defaults (business is off until the member opts in), so
 * the client never invents a value: until the GET succeeds the switches are
 * disabled rather than shown in a guessed state.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GATEWAY_API_URL } from '@/lib/gateway-base';
import { useAuth } from '@/context/AuthProvider';

export interface CompanionPreferences {
  enabled: boolean;
  topic_health: boolean;
  topic_community: boolean;
  topic_business: boolean;
}

export type CompanionPreferencesPatch = Partial<CompanionPreferences>;

interface CompanionPreferencesResponse {
  ok: boolean;
  preferences?: CompanionPreferences;
  error?: string;
}

export const COMPANION_PREFERENCES_PATH = '/companion/preferences';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

async function companionFetch(init?: RequestInit): Promise<CompanionPreferences> {
  const res = await fetch(`${GATEWAY_API_URL}${COMPANION_PREFERENCES_PATH}`, {
    ...init,
    headers: { ...(await authHeaders()), ...(init?.headers || {}) },
  });
  const body = (await res.json().catch(() => ({}))) as CompanionPreferencesResponse;
  if (!res.ok || !body.ok || !body.preferences) {
    throw new Error(body.error || `Gateway ${res.status}`);
  }
  return body.preferences;
}

export function fetchCompanionPreferences(): Promise<CompanionPreferences> {
  return companionFetch({ method: 'GET' });
}

export function patchCompanionPreferences(patch: CompanionPreferencesPatch): Promise<CompanionPreferences> {
  return companionFetch({ method: 'PATCH', body: JSON.stringify(patch) });
}

export function useCompanionPreferences() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const queryKey = ['companion-preferences', userId];

  const query = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: fetchCompanionPreferences,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: patchCompanionPreferences,
    onSuccess: (prefs) => queryClient.setQueryData(queryKey, prefs),
  });

  return {
    preferences: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    isSaving: mutation.isPending,
    update: mutation.mutateAsync,
  };
}
