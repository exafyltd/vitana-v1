/**
 * VTID-05521 (Native Wave 2, ai-assistants lane) — every read and write the
 * `/assistant` screen and the AI-assistant connect flow make, as pure request
 * builders. The data hooks (`./hooks.ts`) send exactly these, so the unit
 * tests assert the built request (method, path, body) against a mocked
 * gateway / Supabase double and nothing is ever fired at a live backend
 * (requirements R5.2). Gateway paths are under `/api/v1` (the shell gateway
 * fetch prepends it, `src/auth/gateway.ts`); each mirrors the web client
 * named on it.
 */

export type GatewayRequest = { method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; path: string; body?: Record<string, unknown> };

/** `src/hooks/useUserPreferences.ts` `UserPreferences` (the `user_preferences` row). */
export type UserPreferences = {
  id: string;
  user_id: string;
  autopilot_enabled: boolean;
  autopilot_max_actions_per_day: number;
  autopilot_quiet_hours_start: string;
  autopilot_quiet_hours_end: string;
  autopilot_priority_filter: 'all' | 'high_medium' | 'high';
  autopilot_categories: { health: boolean; community: boolean; discovery: boolean; memory: boolean };
  stt_language: string;
  stt_instant_enabled: boolean;
  stt_auto_punctuation: boolean;
  stt_sensitivity: number;
  /** Nullable (VTID-03671): null means "derive the voice from stt_language". */
  tts_voice: string | null;
  tts_gender: 'male' | 'female' | 'neutral';
  tts_character: string;
  tts_speed: number;
  tts_pitch: number;
  tts_volume: number;
  ai_model: string;
  ai_temperature: number;
  ai_response_length: 'short' | 'medium' | 'long';
  store_voice_recordings: boolean;
  auto_delete_recordings_days: number;
  auto_greeting_enabled: boolean;
  greeting_frequency: 'session' | 'daily' | 'hourly' | 'off';
  greeting_message_types: string[];
  interests: string[];
  wellness_goals: string[];
  shorts_filtering_enabled: boolean;
  ai_data_consent_given: boolean;
  ai_data_consent_date: string | null;
  created_at: string;
  updated_at: string;
};

/** The web query key (`useUserPreferences.ts` `["user_preferences"]`), scoped to the member like every native key. */
export const userPreferencesKey = (userId: string | null) => ['user_preferences', userId, 'all'] as const;

/** `src/hooks/useAIAssistants.ts` — the `/api/v1/integrations/ai-assistants` routes. */
const AI_BASE = '/integrations/ai-assistants';
export type AIProviderId = 'chatgpt' | 'claude';

export const AI_PROVIDERS_REQUEST: GatewayRequest = { method: 'GET', path: `${AI_BASE}/providers` };
export const AI_CONNECTIONS_REQUEST: GatewayRequest = { method: 'GET', path: `${AI_BASE}/connections` };
export function aiConnectRequest(provider: AIProviderId, apiKey: string): GatewayRequest {
  return { method: 'POST', path: `${AI_BASE}/apikey/${encodeURIComponent(provider)}`, body: { api_key: apiKey } };
}
export function aiVerifyRequest(provider: AIProviderId): GatewayRequest {
  return { method: 'POST', path: `${AI_BASE}/verify/${encodeURIComponent(provider)}` };
}
export function aiDisconnectRequest(provider: AIProviderId): GatewayRequest {
  return { method: 'DELETE', path: `${AI_BASE}/${encodeURIComponent(provider)}` };
}
/** Every ai-assistants query shares this prefix; a mutation invalidates it (web `qc.invalidateQueries({ queryKey: ["ai-assistants"] })`). */
export const AI_ASSISTANTS_KEY = ['ai-assistants'] as const;

/** `src/hooks/useVaea.ts` `useVaeaConfig` — `GET` / `PUT /vaea/config`. */
export const VAEA_CONFIG_REQUEST: GatewayRequest = { method: 'GET', path: '/vaea/config' };
export function vaeaConfigUpdateRequest(patch: Record<string, unknown>): GatewayRequest {
  return { method: 'PUT', path: '/vaea/config', body: patch };
}

/** `src/lib/gateway-tts.ts` `synthesizeViaGateway` — `POST /orb/tts` with the base language. */
export function ttsRequest(text: string, lang: string): GatewayRequest {
  return { method: 'POST', path: '/orb/tts', body: { text: text.trim(), lang: baseLang(lang) } };
}

/** `useIntelligentGreeting.manualGreeting` — the `generate-proactive-greeting` edge function body. */
export function greetingInvokeBody(userId: string, sttLanguage: string | null | undefined) {
  return { user_id: userId, override_language: sttLanguage || 'en-US' };
}

/** gateway-tts.ts `baseLang`: `de-DE` → `de`, empty → `en`. */
export function baseLang(input: string | null | undefined): string {
  return (input || 'en').toLowerCase().split(/[-_]/)[0].slice(0, 2) || 'en';
}

/** ProactiveTalkingPanel `extractLanguageFromVoice`. */
export function languageFromVoice(voice: string | null | undefined): string | null {
  return (voice ?? '').match(/([a-z]{2}-[A-Z]{2})/)?.[1] ?? null;
}

/** ProactiveTalkingPanel `messageTypeMap` — UI message types → generator types. */
export const MESSAGE_TYPE_MAP: Record<string, string> = {
  time_greeting: 'welcome',
  motivational: 'motivation',
  reminder: 'reminder',
  wellness_check: 'recommendation',
};

/** `HH:MM` (the value a web `<input type="time">` produces; the column may carry `:SS`). */
export function isTimeValue(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
}
