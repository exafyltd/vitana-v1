/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — native twin of the
 * data behind the mobile Connected Apps view (`MobileConnectedAppsView.tsx`):
 *
 * - the static integration catalog (`src/components/settings/integrationData.ts`),
 *   with every web English sub-line moved to the `supportNative` catalog;
 * - the class-B web hooks it reads, re-implemented on the native gateway fetch
 *   (which prepends `/api/v1` and adds the member's token): wearable providers
 *   (`useWearableProviders`), AI providers (`useAIProviders`), social
 *   connections (`useSocialConnections`), the gateway mail/calendar/contacts hub
 *   (`connected-apps-client.ts`) and the Autopilot channels (`useVaeaChannels`).
 *
 * Every POST / PATCH / DELETE here is a write. Tests run them only against a
 * mocked gateway; a provider consent URL is handed to `openConsentUrl` (the
 * support port) and never opened by a test.
 */
import { useQuery } from '@tanstack/react-query';
import { getGateway } from '../../../auth/gateway';
import { GatewayError, gatewayJson } from '../../../ports/core';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

// ── integration catalog (integrationData.ts) ───────────────────────────────
export type IntegrationCategory = 'social' | 'fitness' | 'health' | 'other' | 'ai' | 'productivity' | 'media' | 'shopping';

export interface Integration {
  id: string;
  /** A brand name (shown as is), or `nameKey` for a generic name. */
  name?: string;
  nameKey?: string;
  icon: string;
  connected: boolean;
  /** `supportNative.connectors.apps.<id>` — the web's `syncData` line. */
  syncKey: string;
  /** Static last-sync label key (web's hard-coded "30 min ago" on the social demo rows). */
  lastSyncKey?: string;
  /** A formatted live last-sync value (gateway timestamp). */
  lastSync?: string;
  /** Live "syncing" flag (web: lastSync contains "min"). */
  recent?: boolean;
  statusLabelKey?: string;
  comingSoon?: boolean;
  category: IntegrationCategory;
}

const APPS = 'supportNative.connectors.apps';

function item(id: string, icon: string, category: IntegrationCategory, extra: Partial<Integration> & ({ name: string } | { nameKey: string })): Integration {
  return { id, icon, category, connected: false, syncKey: `${APPS}.${id}`, ...extra };
}

const REWARDS = 'supportNative.connectors.status.rewardsActive';

export const shoppingIntegrations: Integration[] = [
  item('aliexpress', 'ShoppingBag', 'shopping', { name: 'AliExpress', connected: true, statusLabelKey: REWARDS }),
  item('bodylab24', 'ShoppingBag', 'shopping', { name: 'Bodylab24', connected: true, statusLabelKey: REWARDS }),
  item('alibaba', 'Globe', 'shopping', { name: 'Alibaba', connected: true, statusLabelKey: REWARDS }),
  item('rockbros', 'Store', 'shopping', { name: 'ROCKBROS', connected: true, statusLabelKey: REWARDS }),
  item('amazon', 'ShoppingBag', 'shopping', { name: 'Amazon', statusLabelKey: 'supportNative.connectors.status.recommendationsOnly' }),
];

export const socialIntegrations: Integration[] = [
  item('linkedin', 'Share2', 'social', { name: 'LinkedIn', connected: true, lastSyncKey: 'supportNative.connectors.lastSync.oneHour' }),
  item('instagram', 'Share2', 'social', { name: 'Instagram', connected: true, lastSyncKey: 'supportNative.connectors.lastSync.thirtyMin', recent: true }),
  item('tiktok', 'Share2', 'social', { name: 'TikTok' }),
  item('youtube', 'Video', 'social', { name: 'YouTube', connected: true, lastSyncKey: 'supportNative.connectors.lastSync.twoHours' }),
  item('facebook', 'Share2', 'social', { name: 'Facebook' }),
  item('x', 'Share2', 'social', { name: 'X (Twitter)' }),
];

export const fitnessIntegrations: Integration[] = [
  item('apple-health', 'Heart', 'fitness', { name: 'Apple Health' }),
  item('fitbit', 'Activity', 'fitness', { name: 'Fitbit' }),
  item('strava', 'Activity', 'fitness', { name: 'Strava' }),
  item('oura', 'Moon', 'fitness', { name: 'Oura Ring' }),
  item('garmin', 'Watch', 'fitness', { name: 'Garmin' }),
  item('myfitnesspal', 'Apple', 'fitness', { name: 'MyFitnessPal' }),
];

export const healthIntegrations: Integration[] = [
  item('lifespin', 'Hospital', 'health', { name: 'Lifespin', comingSoon: true }),
  item('fhir', 'Hospital', 'health', { nameKey: `${APPS}.names.fhir`, comingSoon: true }),
  item('doctorbox', 'TestTube', 'health', { name: 'DoctorBox' }),
];

export const productivityIntegrations: Integration[] = [
  item('gmail', 'Mail', 'productivity', { name: 'Gmail' }),
  item('google-calendar', 'Calendar', 'productivity', { name: 'Google Calendar' }),
  item('google-contacts', 'Contact', 'productivity', { name: 'Google Contacts' }),
  item('apple-mail', 'Mail', 'productivity', { name: 'Apple Mail (iPhone)' }),
  item('apple-calendar', 'Calendar', 'productivity', { name: 'Apple Calendar (iPhone)' }),
  item('iphone-contacts', 'Phone', 'productivity', { name: 'iPhone Contacts' }),
  item('android-contacts', 'Phone', 'productivity', { name: 'Android Contacts' }),
  item('outlook-mail', 'Mail', 'productivity', { name: 'Outlook Mail' }),
  item('outlook-calendar', 'Calendar', 'productivity', { name: 'Outlook Calendar' }),
];

export const mediaIntegrations: Integration[] = [
  item('spotify', 'Music', 'media', { name: 'Spotify' }),
  item('apple-music', 'Music2', 'media', { name: 'Apple Music' }),
  item('youtube-music', 'Music2', 'media', { name: 'YouTube Music' }),
  item('youtube-playback', 'Video', 'media', { name: 'YouTube' }),
];

export const otherIntegrations: Integration[] = [
  item('calm', 'Brain', 'other', { name: 'Calm' }),
  item('headspace', 'Brain', 'other', { name: 'Headspace' }),
  item('smart-scales', 'House', 'other', { nameKey: `${APPS}.names.smartScales`, comingSoon: true }),
  item('air-quality', 'House', 'other', { nameKey: `${APPS}.names.airQuality`, comingSoon: true }),
  item('whatsapp', 'MessageCircle', 'other', { name: 'WhatsApp', comingSoon: true }),
  item('telegram', 'MessageCircle', 'other', { name: 'Telegram', comingSoon: true }),
  item('csv-import', 'Code', 'other', { nameKey: `${APPS}.names.csvImport` }),
  item('api-access', 'Code', 'other', { nameKey: `${APPS}.names.apiAccess`, comingSoon: true }),
];

export const aiAssistantsIntegrations: Integration[] = [
  item('chatgpt', 'Sparkles', 'ai', { name: 'ChatGPT' }),
  item('claude', 'Sparkles', 'ai', { name: 'Claude' }),
];

/** Web `getAllIntegrations`: fitness/health come merged with the live wearable state. */
export function getAllIntegrations(live: { fitness?: Integration[]; health?: Integration[] } = {}): Integration[] {
  return [
    ...aiAssistantsIntegrations,
    ...socialIntegrations,
    ...(live.fitness ?? fitnessIntegrations),
    ...(live.health ?? healthIntegrations),
    ...productivityIntegrations,
    ...mediaIntegrations,
    ...otherIntegrations,
  ];
}

/** Web `getConnectionStats` ("syncing" = connected with a minutes-old sync). */
export function getConnectionStats(all: Integration[]) {
  const connected = all.filter((i) => i.connected).length;
  const syncing = all.filter((i) => i.connected && i.recent).length;
  return { connected, syncing, total: all.length };
}

/** Web connector id sets (useGoogleConnect.ts). */
export const GOOGLE_CONNECTOR_IDS = new Set<string>(['gmail', 'google-contacts', 'google-calendar']);
export const YOUTUBE_CONNECTOR_IDS = new Set<string>(['youtube-music', 'youtube-playback']);
export const SOCIAL_IMPORT_IDS = new Set<string>(['linkedin', 'instagram', 'tiktok', 'youtube', 'facebook', 'x']);

// ── wearables (useWearableProviders.ts) — read-only ─────────────────────────
export interface WearableProvider {
  id: string;
  display_name: string;
  category: string;
  status: 'connected' | 'available';
  last_sync_at: string | null;
}

/** Any failed or malformed reply is an empty list, so nothing shows as connected (web behaviour). */
export function useWearableProviders() {
  return useQuery({
    queryKey: ['wearable-providers'],
    queryFn: async (): Promise<WearableProvider[]> => {
      try {
        const body = await gatewayJson<{ ok?: boolean; providers?: WearableProvider[] }>(getGateway(), '/wearables/providers');
        return body?.ok && Array.isArray(body.providers) ? body.providers : [];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });
}

export function mergeWearableState(integrations: Integration[], providers: WearableProvider[] | undefined, formatDate: (iso: string) => string): Integration[] {
  return integrations.map((integration) => {
    const p = (providers ?? []).find((x) => x.id === integration.id && x.status === 'connected');
    return { ...integration, connected: !!p, lastSync: p?.last_sync_at ? formatDate(p.last_sync_at) : undefined, lastSyncKey: undefined };
  });
}

// ── AI assistants (useAIAssistants.ts) — read ──────────────────────────────
export interface AIProvider {
  provider: string;
  status: 'connected' | 'available' | 'disabled';
  last_verified_at: string | null;
}

export function useAIProviders() {
  return useQuery({
    queryKey: ['ai-assistants', 'providers'],
    queryFn: async (): Promise<AIProvider[]> => {
      const body = await gatewayJson<{ ok?: boolean; error?: string; providers?: AIProvider[] }>(getGateway(), '/integrations/ai-assistants/providers');
      if (!body?.ok) throw new Error(body?.error || 'AI_PROVIDERS_ERROR');
      return body.providers ?? [];
    },
    staleTime: 30_000,
  });
}

// ── social connections (useGoogleConnect.ts) ───────────────────────────────
export interface SocialConnection {
  provider: string;
  username: string;
  display_name: string;
  connected_at: string;
}

export function useSocialConnections() {
  return useQuery({
    queryKey: ['social-connections'],
    queryFn: async (): Promise<SocialConnection[]> => {
      const body = await gatewayJson<{ connections?: SocialConnection[] }>(getGateway(), '/social-accounts/connections');
      return body?.connections ?? [];
    },
    staleTime: 30_000,
    // Web: no retry on an expired session (the banner asks the member to sign in again).
    retry: (n, err) => !(err instanceof GatewayError && err.status === 401) && n < 2,
  });
}

/**
 * Starts the gateway OAuth for a provider (web `useStartSocialOAuth`): GET the
 * consent URL with the in-app return (`?return=mobile` → `/oauth/complete`).
 * Returns the URL; the caller hands it to `openConsentUrl`.
 */
export async function startSocialOAuth(provider: 'google' | 'youtube'): Promise<string> {
  const json = await gatewayJson<{ auth_url?: string }>(getGateway(), `/social-accounts/connect/${provider}?return=mobile`, { method: 'GET' });
  if (!json?.auth_url) throw new Error('Gateway did not return an auth_url');
  return json.auth_url;
}

// ── mail / calendar / contacts hub (connected-apps-client.ts) ───────────────
export type ConnectedAppId =
  | 'gmail'
  | 'google-calendar'
  | 'google-contacts'
  | 'outlook-mail'
  | 'outlook-calendar'
  | 'outlook-contacts'
  | 'apple-mail'
  | 'apple-calendar'
  | 'iphone-contacts'
  | 'android-contacts';

export type AppKind = 'mail' | 'calendar' | 'contacts';

export interface ConnectedAppState {
  id: ConnectedAppId;
  provider: 'google' | 'microsoft' | 'apple' | 'device';
  kind: AppKind;
  method: 'oauth' | 'app_password' | 'device';
  availability: 'ready' | 'not_configured';
  status: 'off' | 'on' | 'needs_reconnect';
  account: string | null;
  syncs: boolean;
  last_sync_at: string | null;
  last_result: Record<string, unknown> | null;
  last_error: string | null;
}

export const APP_ORDER: Record<AppKind, ConnectedAppId[]> = {
  mail: ['gmail', 'outlook-mail', 'apple-mail'],
  calendar: ['google-calendar', 'outlook-calendar', 'apple-calendar'],
  contacts: ['google-contacts', 'outlook-contacts', 'iphone-contacts', 'android-contacts'],
};

export class ConnectedAppsError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
    this.name = 'ConnectedAppsError';
  }
}

async function hubCall<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await getGateway()(`/connected-apps${path}`, { ...init, headers: { ...JSON_HEADERS, ...((init.headers as Record<string, string>) ?? {}) } });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = {};
  }
  if (!res.ok || json.ok === false) throw new ConnectedAppsError(res.status, String(json.error ?? `http_${res.status}`));
  return json as T;
}

export const CONNECTED_APPS_QUERY_KEY = ['connected-apps'] as const;

export async function fetchConnectedApps(): Promise<ConnectedAppState[]> {
  const json = await hubCall<{ apps?: ConnectedAppState[] }>('');
  return json.apps ?? [];
}

export type ConnectOutcome = { status: 'on'; sync?: { ok: boolean } } | { status: 'consent_required'; auth_url: string };

/** POST /connected-apps/:id/connect — the native app always asks for the in-app return. */
export async function connectApp(id: ConnectedAppId, apple?: { apple_id: string; app_password: string }): Promise<ConnectOutcome> {
  const json = await hubCall<{ status?: string; auth_url?: string; sync?: { ok: boolean } }>(`/${id}/connect`, {
    method: 'POST',
    body: JSON.stringify({ return: 'mobile', ...(apple ?? {}) }),
  });
  return json.status === 'consent_required' ? { status: 'consent_required', auth_url: String(json.auth_url) } : { status: 'on', sync: json.sync };
}

export async function disconnectApp(id: ConnectedAppId, removeData = false): Promise<void> {
  await hubCall(`/${id}/disconnect`, { method: 'POST', body: JSON.stringify({ remove_data: removeData }) });
}

export async function syncConnectedApp(id: ConnectedAppId): Promise<{ ok: boolean }> {
  return hubCall<{ ok: boolean }>(`/${id}/sync`, { method: 'POST' });
}

// ── Autopilot channels (useVaea.ts useVaeaChannels) ─────────────────────────
export type ChannelPlatform = 'maxina' | 'slack' | 'discord' | 'telegram' | 'reddit' | 'custom';
export const CHANNEL_PLATFORMS: ChannelPlatform[] = ['maxina', 'slack', 'discord', 'telegram', 'reddit', 'custom'];

export interface VaeaChannel {
  id: string;
  platform: ChannelPlatform;
  channel_key: string;
  display_name: string | null;
  active: boolean;
  dry_run: boolean;
  last_error: string | null;
}

export const VAEA_CHANNELS_QUERY_KEY = ['vaea-channels'] as const;

export async function fetchVaeaChannels(): Promise<VaeaChannel[]> {
  const json = await gatewayJson<{ channels?: VaeaChannel[] }>(getGateway(), '/vaea/channels');
  return json?.channels ?? [];
}

export async function createVaeaChannel(payload: { platform: ChannelPlatform; channel_key: string; display_name: string | null; dry_run: boolean }): Promise<void> {
  await gatewayJson(getGateway(), '/vaea/channels', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) });
}

export async function patchVaeaChannel(id: string, body: { active: boolean }): Promise<void> {
  await gatewayJson(getGateway(), `/vaea/channels/${encodeURIComponent(id)}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) });
}

export async function removeVaeaChannel(id: string): Promise<void> {
  await gatewayJson(getGateway(), `/vaea/channels/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
