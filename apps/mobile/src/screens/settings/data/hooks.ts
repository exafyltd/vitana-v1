/**
 * VTID-05431 (Native Wave 2, settings lane) — the settings data hooks,
 * re-implemented natively (plan decision 2: the web hooks are class B — they
 * import the web Supabase client, `import.meta.env` or `localStorage` — so
 * they are never moved into `@vitana/core`). Same tables, RPCs, gateway paths,
 * query keys, optimistic updates and rollbacks as the web hook named on each;
 * Supabase through the shell's injected client (`getSupabase()`), the gateway
 * through `getGateway()` (bare paths, `/api/v1` prepended). Every write sends
 * the request built in `./requests.ts`, which the unit tests assert against a
 * mocked gateway / Supabase double (R5.2).
 */
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { getGateway } from '../../../auth/gateway';
import { useAuth } from '../../../auth/AuthProvider';
import { deviceStorage } from '../../../identity/device-storage';
import { gatewayJson, GatewayError } from '../../../ports/core';
import { notify, notifyError } from '../../../ports/ui';
import {
  BILLING_PORTAL_REQUEST,
  DEFAULT_NOTIFICATION_PREFS,
  PHONE_REMOVE_REQUEST,
  aiConsentUpdate,
  categoryToggleRequest,
  companionPatchRequest,
  creatorOnboardRequest,
  isStripeConnectUrl,
  limitationsPatchRequest,
  notificationPrefsUpsert,
  phoneConfirmRequest,
  phoneErrorCode,
  phoneSendCodeRequest,
  type CompanionPreferences,
  type GatewayRequest,
  type NotificationPreferences,
  type PhoneVerifyErrorCode,
} from './requests';

/** Sends one built request through the shell gateway (JSON in, JSON out; non-2xx throws GatewayError). */
export function sendGateway<T>(req: GatewayRequest): Promise<T> {
  return gatewayJson<T>(getGateway(), req.path, {
    method: req.method,
    ...(req.body !== undefined ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(req.body) } : {}),
  });
}

const getJson = <T>(path: string) => sendGateway<T>({ method: 'GET', path });

// ── notifications (src/hooks/useNotifications.ts useNotificationPreferences) ──

export function useNotificationPreferences() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS);
  const query = useQuery({
    queryKey: ['user_notification_preferences', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('user_notification_preferences').select('*').eq('user_id', userId as string).maybeSingle();
      if (error) throw error;
      return (data as Partial<NotificationPreferences> | null) ?? null;
    },
  });
  useEffect(() => {
    const d = query.data;
    if (!d) return;
    setPrefs({
      push_enabled: d.push_enabled ?? true,
      live_room_notifications: d.live_room_notifications ?? true,
      match_notifications: d.match_notifications ?? true,
      recommendation_notifications: d.recommendation_notifications ?? true,
      task_notifications: d.task_notifications ?? true,
      community_notifications: d.community_notifications ?? true,
      memory_notifications: d.memory_notifications ?? false,
      dnd_enabled: d.dnd_enabled ?? false,
      dnd_start_time: d.dnd_start_time ?? null,
      dnd_end_time: d.dnd_end_time ?? null,
    });
  }, [query.data]);

  const updatePref = useCallback(
    async (field: keyof NotificationPreferences, value: boolean) => {
      if (!userId) return;
      const previous = prefs;
      const updated = { ...prefs, [field]: value };
      setPrefs(updated);
      const up = notificationPrefsUpsert(userId, updated, new Date().toISOString());
      const { error } = await getSupabase().from(up.table).upsert(up.row as never, up.options);
      if (error) {
        setPrefs(previous);
        throw error;
      }
      // VTID-04676: quiet hours are checked in the member's timezone — save the device's with them.
      if (field === 'dnd_enabled' || field === 'dnd_start_time' || field === 'dnd_end_time') void saveDeviceTimeZone(userId);
    },
    [prefs, userId],
  );

  // Web: `loading` starts true and turns false once the read settles (success or error).
  return { prefs, loading: !query.isFetched, updatePref };
}

/** src/lib/notifications/device-timezone.ts — best effort. */
export async function saveDeviceTimeZone(userId: string): Promise<void> {
  let tz: string | null = null;
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    tz = null;
  }
  if (!tz) return;
  try {
    await getSupabase().from('profiles').update({ timezone: tz } as never).eq('user_id', userId);
  } catch {
    /* the server default stays */
  }
}

// ── notification categories (src/hooks/useNotificationCategoryPreferences.ts) ──

export type CategoryPreference = {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  enabled: boolean;
  locked?: boolean;
  types?: string[];
};
export type RoleNotification = { type: string; label: { en: string; de: string }; description: { en: string; de: string } };
export type CategoryGroups = { chat: CategoryPreference[]; calendar: CategoryPreference[]; community: CategoryPreference[] };
type CategoryResponse = { grouped: CategoryGroups; role: string | null; roleNotifications: RoleNotification[] };

export function useNotificationCategoryPreferences(localeBase: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ['user-category-preferences', user?.id, localeBase];
  const query = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<CategoryResponse> => {
      const json = await getJson<{ data: CategoryGroups; role?: string | null; role_notifications?: RoleNotification[] }>(
        `/notifications/category-preferences?locale=${encodeURIComponent(localeBase)}`,
      );
      return { grouped: json.data, role: json.role ?? null, roleNotifications: json.role_notifications ?? [] };
    },
  });
  const toggle = useMutation({
    mutationFn: ({ categoryId, enabled }: { categoryId: string; enabled: boolean }) => sendGateway(categoryToggleRequest(categoryId, enabled)),
    onMutate: async ({ categoryId, enabled }) => {
      await qc.cancelQueries({ queryKey: ['user-category-preferences'] });
      const previous = qc.getQueryData<CategoryResponse>(queryKey);
      if (previous) {
        const grouped = { ...previous.grouped };
        for (const type of ['chat', 'calendar', 'community'] as const) {
          grouped[type] = (grouped[type] || []).map((c) => (c.id === categoryId ? { ...c, enabled } : c));
        }
        qc.setQueryData(queryKey, { ...previous, grouped });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['user-category-preferences'] });
    },
  });
  return {
    categories: query.data?.grouped,
    role: query.data?.role ?? null,
    roleNotifications: query.data?.roleNotifications ?? [],
    loading: query.isLoading,
    toggleCategory: (categoryId: string, enabled: boolean) => toggle.mutateAsync({ categoryId, enabled }),
  };
}

// ── Vitana messages (src/hooks/useCompanionPreferences.ts) ──

type CompanionResponse = { ok: boolean; preferences?: CompanionPreferences; error?: string };

async function companionCall(req: GatewayRequest): Promise<CompanionPreferences> {
  const body = await sendGateway<CompanionResponse>(req);
  if (!body?.ok || !body.preferences) throw new Error(body?.error || 'companion');
  return body.preferences;
}

export function useCompanionPreferences() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const queryKey = ['companion-preferences', userId];
  const query = useQuery({ queryKey, enabled: !!userId, staleTime: 60_000, queryFn: () => companionCall({ method: 'GET', path: '/companion/preferences' }) });
  const mutation = useMutation({
    mutationFn: (patch: Partial<CompanionPreferences>) => companionCall(companionPatchRequest(patch)),
    onSuccess: (prefs) => qc.setQueryData(queryKey, prefs),
  });
  return { preferences: query.data ?? null, isLoading: query.isLoading, isError: query.isError, isSaving: mutation.isPending, update: mutation.mutateAsync };
}

// ── privacy: community intro (src/lib/community-intro.ts) ──

export function useCommunityIntro() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const queryKey = ['community-intro-opt-in', userId];
  const query = useQuery({
    queryKey,
    enabled: !!userId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('global_community_profiles').select('community_intro_opt_in').eq('user_id', userId as string).maybeSingle();
      if (error) throw error;
      return (data as { community_intro_opt_in?: boolean } | null)?.community_intro_opt_in === true;
    },
  });
  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await getSupabase().from('global_community_profiles').update({ community_intro_opt_in: next } as never).eq('user_id', userId);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => qc.setQueryData(queryKey, next),
    onError: () => notifyError('screens.settings.communityIntroSaveFailed'),
  });
  return { userId, optedIn: query.data, isError: query.isError, isLoading: query.isLoading, set: mutation.mutate, isPending: mutation.isPending };
}

// ── privacy: phone discoverability (PhoneDiscoverabilityToggle.tsx) ──

export function usePhoneDiscoverability() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const queryKey = ['phone-discoverability', userId];
  const query = useQuery({
    queryKey,
    enabled: !!userId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('profiles').select('discoverable_by_phone').eq('user_id', userId as string).maybeSingle();
      if (error) throw error;
      return (data as { discoverable_by_phone?: boolean } | null)?.discoverable_by_phone !== false;
    },
  });
  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await getSupabase().from('profiles').update({ discoverable_by_phone: next } as never).eq('user_id', userId);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => qc.setQueryData(queryKey, next),
  });
  return { userId, discoverable: query.data, isError: query.isError, isLoading: query.isLoading, set: mutation.mutate, isPending: mutation.isPending };
}

// ── privacy: phone number (src/lib/phone-verification-client.ts, usePhoneVerificationStatus.ts) ──

export type PhoneStatus = { enabled: boolean; verified: boolean; phone_masked: string | null; discoverable: boolean; resend_after_seconds: number };

export class PhoneVerifyRequestError extends Error {
  constructor(
    public status: number,
    public code: PhoneVerifyErrorCode,
  ) {
    super(code);
    this.name = 'PhoneVerifyRequestError';
  }
}

/** `call()` in phone-verification-client.ts: a non-2xx or `ok: false` answer throws with the gateway's error code. */
async function phoneCall(req: GatewayRequest): Promise<Record<string, unknown>> {
  let json: Record<string, unknown>;
  try {
    json = ((await sendGateway<Record<string, unknown>>(req)) ?? {}) as Record<string, unknown>;
  } catch (e) {
    if (e instanceof GatewayError) {
      const body = (e.body && typeof e.body === 'object' ? e.body : {}) as { error?: unknown };
      throw new PhoneVerifyRequestError(e.status, phoneErrorCode(body.error));
    }
    throw new PhoneVerifyRequestError(0, 'unknown');
  }
  if (json.ok === false) throw new PhoneVerifyRequestError(200, phoneErrorCode(json.error));
  return json;
}

export const phoneStatusQueryKey = (userId: string | null | undefined) => ['phone-verification-status', userId ?? null];

export function usePhoneStatus(): PhoneStatus | undefined {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: phoneStatusQueryKey(user?.id),
    enabled: !!user?.id,
    retry: false,
    staleTime: 60_000,
    queryFn: async (): Promise<PhoneStatus> => {
      const json = await phoneCall({ method: 'GET', path: '/me/phone' });
      const resend = json.resend_after_seconds;
      return {
        enabled: json.enabled === true,
        verified: json.verified === true,
        phone_masked: typeof json.phone_masked === 'string' ? json.phone_masked : null,
        discoverable: json.discoverable !== false,
        resend_after_seconds: typeof resend === 'number' && Number.isFinite(resend) ? resend : 60,
      };
    },
  });
  return data?.enabled ? data : undefined;
}

export async function sendPhoneCode(phone: string, region: string | undefined): Promise<{ phone_masked: string | null; resend_after_seconds: number }> {
  const json = await phoneCall(phoneSendCodeRequest(phone, region));
  const resend = json.resend_after_seconds;
  return {
    phone_masked: typeof json.phone_masked === 'string' ? json.phone_masked : null,
    resend_after_seconds: typeof resend === 'number' && Number.isFinite(resend) ? resend : 60,
  };
}

export async function confirmPhoneCode(code: string): Promise<void> {
  await phoneCall(phoneConfirmRequest(code));
}

export async function removeVerifiedPhone(): Promise<void> {
  await phoneCall(PHONE_REMOVE_REQUEST);
}

/** The phone the member typed into their profile — only a prefill suggestion (VerifyPhoneDialog.tsx:58). */
export async function fetchProfilePhone(userId: string): Promise<string | null> {
  const { data } = await getSupabase().from('profiles').select('phone').eq('user_id', userId).maybeSingle();
  return (data as { phone?: string | null } | null)?.phone ?? null;
}

// ── privacy: AI data consent (src/hooks/useAIConsent.ts + useUserPreferences) ──

/** The web's localStorage key, kept per device (deviceStorage = AsyncStorage). */
export const AI_CONSENT_KEY = 'vitana_ai_consent_given';

export function useAIConsent() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const [localConsent, setLocalConsent] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.resolve(deviceStorage.getItem(AI_CONSENT_KEY)).then((v) => {
      if (active && v === 'true') setLocalConsent(true);
    });
    return () => {
      active = false;
    };
  }, []);
  const query = useQuery({
    queryKey: ['user_preferences', 'ai_consent', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('user_preferences').select('ai_data_consent_given').eq('user_id', userId as string).maybeSingle();
      if (error) throw error;
      return (data as { ai_data_consent_given?: boolean | null } | null)?.ai_data_consent_given ?? null;
    },
  });
  const server = query.data;
  useEffect(() => {
    if (server === true) {
      void deviceStorage.setItem(AI_CONSENT_KEY, 'true');
      setLocalConsent(true);
    } else if (server === false) {
      void deviceStorage.removeItem(AI_CONSENT_KEY);
      setLocalConsent(false);
    }
  }, [server]);
  const persist = useCallback(
    async (granted: boolean) => {
      if (!userId) return;
      const { error } = await getSupabase().from('user_preferences').update(aiConsentUpdate(granted, new Date().toISOString()) as never).eq('user_id', userId);
      if (!error) void qc.invalidateQueries({ queryKey: ['user_preferences'] });
    },
    [qc, userId],
  );
  const grantConsent = useCallback(() => {
    void deviceStorage.setItem(AI_CONSENT_KEY, 'true');
    setLocalConsent(true);
    setDialogOpen(false);
    void persist(true);
  }, [persist]);
  const revokeConsent = useCallback(() => {
    void deviceStorage.removeItem(AI_CONSENT_KEY);
    setLocalConsent(false);
    void persist(false);
  }, [persist]);
  return { hasConsent: localConsent || server === true, dialogOpen, setDialogOpen, grantConsent, revokeConsent };
}

// ── billing (src/hooks/useBilling.ts, src/lib/billingApi.ts) ──

export type BillingMe = {
  ok: true;
  plan: {
    plan_key: string;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    trial_end: string | null;
    price_key: string | null;
    source: string | null;
  };
  stripe: { has_customer: boolean; has_paid_subscription: boolean };
};

export function useBilling() {
  return useQuery<BillingMe>({ queryKey: ['billing', 'me'], staleTime: 30_000, retry: 1, queryFn: () => getJson<BillingMe>('/billing/me') });
}

/** `useOpenPortal` + `window.location.assign(url)` → the system browser. */
export function useOpenPortal() {
  const mutation = useMutation({ mutationFn: () => sendGateway<{ ok: true; url: string }>(BILLING_PORTAL_REQUEST) });
  const open = useCallback(async () => {
    try {
      const result = await mutation.mutateAsync();
      if (result?.url) await Linking.openURL(result.url);
    } catch {
      /* billingFetch surfaces its own error; nothing else to do here */
    }
  }, [mutation]);
  return { open, isPending: mutation.isPending };
}

// ── creator payments (src/hooks/useCreator.ts) ──

export type CreatorStatus = { stripe_account_id: string | null; charges_enabled: boolean; payouts_enabled: boolean; onboarded_at: string | null };

export function useCreatorStatus() {
  return useQuery({
    queryKey: ['creator', 'status'],
    staleTime: 60_000,
    queryFn: async (): Promise<CreatorStatus> => {
      const data = await getJson<Record<string, unknown>>('/creators/status');
      return {
        stripe_account_id: (data.stripe_account_id as string) ?? null,
        charges_enabled: data.charges_enabled === true,
        payouts_enabled: data.payouts_enabled === true,
        onboarded_at: (data.onboarded_at as string) ?? null,
      };
    },
  });
}

/** `urls` is read when the member taps (building an app link needs the native manifest). */
export function useCreatorOnboard(urls: () => { returnUrl: string; refreshUrl: string }) {
  return useMutation({
    mutationFn: async () => {
      const { returnUrl, refreshUrl } = urls();
      const data = await sendGateway<{ onboarding_url?: string }>(creatorOnboardRequest(returnUrl, refreshUrl));
      if (!isStripeConnectUrl(data?.onboarding_url)) throw new Error('Invalid onboarding URL - must be Stripe Connect');
      await Linking.openURL(data.onboarding_url);
    },
    onError: () => notifyError('toasts.hooks.onboardingFailed'),
  });
}

export function useCreatorDashboard() {
  return useMutation({
    mutationFn: async () => {
      const data = await getJson<{ dashboard_url?: string }>('/creators/dashboard');
      if (!isStripeConnectUrl(data?.dashboard_url)) throw new Error('Invalid dashboard URL - must be Stripe Connect');
      await Linking.openURL(data.dashboard_url);
    },
    onError: () => notifyError('toasts.hooks.dashboardUnavailable'),
  });
}

// ── limitations (src/pages/settings/Limitations.tsx) ──

export type Limitations = {
  allergies: string[];
  dietary_restrictions: string[];
  contraindications: string[];
  current_medications: string[];
  pregnancy_status: string | null;
  age_bracket: string | null;
  religious_restrictions: string[];
  ingredient_sensitivities: string[];
  physical_accessibility_needs: string[];
  budget_max_per_product_cents: number | null;
  budget_monthly_cap_cents: number | null;
  budget_preferred_band: string | null;
};
export type LimitationsImpact = { ok: boolean; total_active_products?: number; hidden_breakdown?: Record<string, number>; hidden_total_approx?: number };

export const EMPTY_LIMITATIONS: Limitations = {
  allergies: [],
  dietary_restrictions: [],
  contraindications: [],
  current_medications: [],
  pregnancy_status: null,
  age_bracket: null,
  religious_restrictions: [],
  ingredient_sensitivities: [],
  physical_accessibility_needs: [],
  budget_max_per_product_cents: null,
  budget_monthly_cap_cents: null,
  budget_preferred_band: null,
};

type LimitationsRow = Partial<Limitations> & { field_last_verified?: Record<string, string> };

export function useLimitations() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<Limitations>(EMPTY_LIMITATIONS);
  const [impact, setImpact] = useState<LimitationsImpact | null>(null);
  const [lastVerified, setLastVerified] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [lim, imp] = await Promise.allSettled([getJson<{ limitations?: LimitationsRow }>('/user/limitations'), getJson<LimitationsImpact>('/user/limitations/impact')]);
        if (lim.status === 'rejected') throw lim.reason;
        const row = lim.value?.limitations;
        if (active && row) {
          setState({
            allergies: row.allergies ?? [],
            dietary_restrictions: row.dietary_restrictions ?? [],
            contraindications: row.contraindications ?? [],
            current_medications: row.current_medications ?? [],
            pregnancy_status: row.pregnancy_status ?? null,
            age_bracket: row.age_bracket ?? null,
            religious_restrictions: row.religious_restrictions ?? [],
            ingredient_sensitivities: row.ingredient_sensitivities ?? [],
            physical_accessibility_needs: row.physical_accessibility_needs ?? [],
            budget_max_per_product_cents: row.budget_max_per_product_cents ?? null,
            budget_monthly_cap_cents: row.budget_monthly_cap_cents ?? null,
            budget_preferred_band: row.budget_preferred_band ?? null,
          });
          setLastVerified(row.field_last_verified ?? {});
        }
        if (active && imp.status === 'fulfilled') setImpact(imp.value);
      } catch {
        notifyError('toasts.settings.couldNotLoadLimitations');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const save = useCallback(async (partial: Partial<Limitations>) => {
    setSaving(true);
    try {
      await sendGateway(limitationsPatchRequest(partial));
      notify('toasts.settings.saved');
      try {
        setImpact(await getJson<LimitationsImpact>('/user/limitations/impact'));
      } catch {
        /* the counter keeps its last value, as on the web */
      }
    } catch {
      notifyError('toasts.settings.saveFailed');
    } finally {
      setSaving(false);
    }
  }, []);

  return { loading, saving, state, setState, impact, lastVerified, save };
}

// ── tenant & role (src/hooks/useMemberships.ts without a tenant id) ──

export type Membership = { id: string; role: string; status: string; tenant_id: string; tenants: { id: string; name: string; slug: string } };

/**
 * `useMemberships()` as TenantRole.tsx calls it (no tenant id): the
 * `list_my_memberships` function. Its `roles` is derived the same way as the
 * web hook (only when the payload is a list of strings).
 */
export function useAllMemberships() {
  const query = useQuery({
    queryKey: ['memberships', undefined],
    queryFn: async () => {
      const { data, error } = await getSupabase().functions.invoke('list_my_memberships');
      if (error) throw error;
      return ((data as { memberships?: unknown[] } | null)?.memberships ?? []) as unknown[];
    },
  });
  const list = query.data;
  const roles = Array.isArray(list) && typeof list[0] === 'string' ? (list as string[]) : undefined;
  const memberships = roles ? undefined : (list as Membership[] | undefined);
  return { memberships, roles, isLoading: query.isLoading };
}
