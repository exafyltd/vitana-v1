/**
 * VTID-05521 (Native Wave 2, ai-assistants lane) — the `/assistant` data
 * hooks, re-implemented natively (plan decision 2: the web hooks import the
 * web Supabase client / `import.meta.env`, so they are class B and never move
 * into `@vitana/core`). Same tables, edge function, gateway paths, query keys
 * and invalidations as the web hook named on each; Supabase through the
 * shell's injected client (`getSupabase()`), the gateway through
 * `getGateway()` (bare paths, `/api/v1` prepended, bearer token added). Every
 * call sends the request built in `./requests.ts`, which the unit tests assert
 * against a mocked gateway / Supabase double (R5.2).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { getGateway } from '../../../auth/gateway';
import { useAuth } from '../../../auth/AuthProvider';
import { notifyError } from '../../../ports/ui';
import { playAudio } from '../../../ports/assistant';
import {
  AI_ASSISTANTS_KEY,
  AI_CONNECTIONS_REQUEST,
  AI_PROVIDERS_REQUEST,
  VAEA_CONFIG_REQUEST,
  aiConnectRequest,
  aiDisconnectRequest,
  aiVerifyRequest,
  greetingInvokeBody,
  ttsRequest,
  userPreferencesKey,
  vaeaConfigUpdateRequest,
  type AIProviderId,
  type GatewayRequest,
  type UserPreferences,
} from './requests';

type Json = Record<string, unknown>;

/** Sends one built request through the shell gateway; returns the status and the parsed body (`{}` when it is not JSON, like the web's `.catch(() => ({}))`). */
export async function sendRaw(req: GatewayRequest): Promise<{ ok: boolean; status: number; body: Json }> {
  const res = await getGateway()(req.path, {
    method: req.method,
    ...(req.body !== undefined ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(req.body) } : {}),
  });
  let body: Json = {};
  try {
    const text = await res.text();
    const parsed: unknown = text ? JSON.parse(text) : {};
    body = parsed && typeof parsed === 'object' ? (parsed as Json) : {};
  } catch {
    body = {};
  }
  return { ok: res.ok, status: res.status, body };
}

const errorText = (body: Json, fallback: string) => (typeof body.error === 'string' && body.error ? body.error : fallback);

// ── user_preferences (src/hooks/useUserPreferences.ts) ──

export function useUserPreferences() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const key = userPreferencesKey(userId);

  const query = useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: async (): Promise<UserPreferences> => {
      if (!userId) throw new Error('Not authenticated');
      const sb = getSupabase();
      const { data, error } = await sb.from('user_preferences').select('*').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      // No row yet: create the default one, exactly like the web hook.
      if (!data) {
        const { data: created, error: insertError } = await sb
          .from('user_preferences')
          .insert({ user_id: userId } as never)
          .select()
          .single();
        if (insertError) throw insertError;
        return created as unknown as UserPreferences;
      }
      return data as unknown as UserPreferences;
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await getSupabase()
        .from('user_preferences')
        .update(updates as never)
        .eq('user_id', userId);
      if (error) throw error;
    },
    // The controls are bound to the row, so show the new value at once (a slider drag follows the
    // thumb); the refetch after the write is the source of truth, and an error rolls back.
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<UserPreferences>(key);
      if (previous) qc.setQueryData<UserPreferences>(key, { ...previous, ...updates });
      return { previous };
    },
    onError: (error, _updates, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
      notifyError('toasts.hooks.errorUpdatingPreferences', 'aiAssistantsNative.toast.errorDetail', {
        message: error instanceof Error ? error.message : String(error),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['user_preferences'] });
    },
  });

  const { mutate } = mutation;
  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => mutate(updates), [mutate]);

  return {
    preferences: query.data,
    // web: the query itself resolves the user, so it is loading until the session is known
    isLoading: authLoading || query.isLoading,
    error: query.error,
    updatePreferences,
    isUpdating: mutation.isPending,
  };
}

// ── AI assistants (src/hooks/useAIAssistants.ts) ──

export type AIProvider = {
  provider: AIProviderId;
  display_name: string;
  description: string | null;
  docs_url: string | null;
  capabilities: string[];
  auth_type: string;
  status: 'connected' | 'available' | 'disabled';
  connection_id: string | null;
  last_verified_at: string | null;
  last_verify_status: string | null;
  allowed_models: string[];
  cost_cap_usd_month: number | null;
};

export type AIConnection = {
  connection_id: string;
  provider: AIProviderId;
  status: 'connected' | 'disconnected';
  key_prefix: string | null;
  key_last4: string | null;
  last_verified_at: string | null;
  last_verify_status: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
};

export type VerifyResult = {
  ok: boolean;
  provider: string;
  status: 'ok' | 'unauthorized' | 'network' | 'error';
  http_status: number;
  latency_ms: number;
  error: string | null;
};

export function useAIProviders() {
  return useQuery({
    queryKey: [...AI_ASSISTANTS_KEY, 'providers'],
    staleTime: 30_000,
    queryFn: async (): Promise<AIProvider[]> => {
      const { ok, status, body } = await sendRaw(AI_PROVIDERS_REQUEST);
      if (!ok) throw new Error(`Failed to load AI providers: ${status}`);
      if (!body.ok) throw new Error(errorText(body, 'AI_PROVIDERS_ERROR'));
      return (body.providers as AIProvider[] | undefined) ?? [];
    },
  });
}

export function useAIConnections() {
  return useQuery({
    queryKey: [...AI_ASSISTANTS_KEY, 'connections'],
    staleTime: 10_000,
    queryFn: async (): Promise<AIConnection[]> => {
      const { ok, status, body } = await sendRaw(AI_CONNECTIONS_REQUEST);
      if (!ok) throw new Error(`Failed to load AI connections: ${status}`);
      if (!body.ok) throw new Error(errorText(body, 'AI_CONNECTIONS_ERROR'));
      return (body.connections as AIConnection[] | undefined) ?? [];
    },
  });
}

/** POST /apikey/:provider — the key is sent once and never stored or echoed; only key_prefix / key_last4 come back. */
export function useConnectAIProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { provider: AIProviderId; api_key: string }) => {
      const { ok, status, body } = await sendRaw(aiConnectRequest(params.provider, params.api_key));
      if (!ok || !body.ok) throw new Error(errorText(body, `CONNECT_FAILED_${status}`));
      return body as { ok: true; connection_id: string; key_prefix: string; key_last4: string };
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: AI_ASSISTANTS_KEY }),
  });
}

/** POST /verify/:provider — 200 even when the provider rejects the key; only a 5xx throws. */
export function useVerifyAIProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { provider: AIProviderId }) => {
      const { ok, status, body } = await sendRaw(aiVerifyRequest(params.provider));
      if (!ok && status >= 500) throw new Error(errorText(body, `VERIFY_FAILED_${status}`));
      return body as unknown as VerifyResult;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: AI_ASSISTANTS_KEY }),
  });
}

export function useDisconnectAIProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { provider: AIProviderId }) => {
      const { ok, status, body } = await sendRaw(aiDisconnectRequest(params.provider));
      if (!ok || !body.ok) throw new Error(errorText(body, `DISCONNECT_FAILED_${status}`));
      return body as { ok: true; provider: string };
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: AI_ASSISTANTS_KEY }),
  });
}

// ── VAEA referrals config (src/hooks/useVaea.ts useVaeaConfig) ──

export type AutonomyMode = 'silent' | 'draft_to_user' | 'one_tap_approve' | 'auto_post';

export type VaeaConfig = {
  user_id: string;
  tenant_id: string;
  receive_recommendations: boolean;
  give_recommendations: boolean;
  make_money_goal: boolean;
  autonomy_default: AutonomyMode;
  autonomy_by_channel: Record<string, AutonomyMode>;
  voice_samples: string[];
  disclosure_text: string;
  expertise_zones: string[];
  excluded_categories: string[];
  blocked_counterparties: string[];
  max_replies_per_day: number;
  min_minutes_between_replies: number;
  mesh_scope: 'maxina_only' | 'open';
  updated_at?: string;
};

/** web `vaeaFetch`: a non-2xx throws the body's `error` / `message`, else the status. */
async function vaeaSend<T>(req: GatewayRequest): Promise<T> {
  const { ok, status, body } = await sendRaw(req);
  if (!ok) {
    const msg = (typeof body.error === 'string' && body.error) || (typeof body.message === 'string' && body.message) || `${status}`;
    throw new Error(msg);
  }
  return body as T;
}

export function useVaeaConfig() {
  const [config, setConfig] = useState<VaeaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await vaeaSend<{ ok: boolean; config: VaeaConfig | null }>(VAEA_CONFIG_REQUEST);
      if (alive.current) setConfig(payload.config);
    } catch (err) {
      if (alive.current) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  const update = useCallback(async (patch: Partial<VaeaConfig>) => {
    const payload = await vaeaSend<{ ok: boolean; config: VaeaConfig }>(vaeaConfigUpdateRequest(patch));
    if (alive.current) setConfig(payload.config);
    return payload.config;
  }, []);

  useEffect(() => {
    alive.current = true;
    void reload();
    return () => {
      alive.current = false;
    };
  }, [reload]);

  return { config, loading, error, reload, update };
}

// ── speech (src/lib/gateway-tts.ts + useTextToSpeech's cloud path) ──

export type GatewayTts = { audioB64: string; mime: string };

/** `synthesizeViaGateway`: null when the gateway cannot serve the language (e.g. Serbian) or the call fails. */
export async function synthesizeViaGateway(text: string, lang: string): Promise<GatewayTts | null> {
  if (!text.trim()) return null;
  try {
    const { ok, body } = await sendRaw(ttsRequest(text, lang));
    if (!ok || !body.ok || typeof body.audio_b64 !== 'string' || !body.audio_b64) return null;
    return { audioB64: body.audio_b64, mime: typeof body.mime === 'string' && body.mime ? body.mime : 'audio/mp3' };
  } catch {
    return null;
  }
}

/**
 * Speaks `text` through the gateway's Polly-first route when the member gave
 * AI-data consent (the web hook's two rules: consent, and a language the
 * gateway can serve). Returns false when nothing could be played — the web
 * would fall back to browser speech, which the native app does not have.
 */
export function useGatewaySpeech(preferences: UserPreferences | undefined) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speak = useCallback(
    async (text: string): Promise<boolean> => {
      if (!preferences?.ai_data_consent_given) return false;
      setIsSpeaking(true);
      try {
        const cloud = await synthesizeViaGateway(text, preferences.stt_language || 'en-US');
        if (!cloud) return false;
        await playAudio(cloud.audioB64, cloud.mime, (preferences.tts_volume ?? 100) / 100);
        return true;
      } finally {
        setIsSpeaking(false);
      }
    },
    [preferences],
  );
  return { speak, isSpeaking };
}

// ── proactive greeting (src/hooks/useIntelligentGreeting.ts manualGreeting / clearGreetingState) ──

export type GreetingMessage = { text: string; type: string; priority: 'low' | 'medium' | 'high'; context?: unknown };

/**
 * The web keeps "greeted this session" in sessionStorage (`vitana_greeting_spoken`, set by the
 * auto-greeting scheduler); the app's session is the running process. "Reset session" clears it.
 */
let greetedThisSession = false;
export const greetingSession = {
  hasGreeted: () => greetedThisSession,
  set: (value: boolean) => {
    greetedThisSession = value;
  },
  clear: () => {
    greetedThisSession = false;
  },
};

export function useManualGreeting(preferences: UserPreferences | undefined) {
  const { speak, isSpeaking } = useGatewaySpeech(preferences);
  const [lastGreeting, setLastGreeting] = useState<GreetingMessage | null>(null);

  const manualGreeting = useCallback(async () => {
    try {
      if (!preferences?.ai_data_consent_given) return;
      const sb = getSupabase();
      const { data: sessionData } = await sb.auth.getSession();
      const session = sessionData.session;
      if (!session?.access_token || !session.user?.id) return;
      // The greeting is composed by the model in the edge function (CLAUDE.md rules 41-42) — never a fixed line here.
      const { data, error } = await sb.functions.invoke('generate-proactive-greeting', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: greetingInvokeBody(session.user.id, preferences.stt_language),
      });
      if (error) throw error;
      const payload = (data ?? {}) as { greeting?: string; context?: unknown };
      if (!payload.greeting) return;
      setLastGreeting({ text: payload.greeting, type: 'ai_generated', priority: 'medium', context: payload.context });
      await speak(payload.greeting);
    } catch {
      // web: console.error only; the panel stays as it was
    }
  }, [preferences, speak]);

  const clearGreetingState = useCallback(() => greetingSession.clear(), []);

  return { manualGreeting, clearGreetingState, lastGreeting, isSpeaking };
}
