/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the data of
 * "Find Friends" (web VTID-05058 ContactSyncModal), re-implemented natively
 * from the class-B web modules:
 *  - `src/lib/connected-apps-client.ts`: `GET /connected-apps`,
 *    `POST /connected-apps/:id/sync`, `POST /connected-apps/android-contacts/import`
 *    ({ contacts ≤ 5000, method, region }),
 *  - `src/hooks/useContactSync.ts`: consent (a stored import with consent, or
 *    the per-member device flag `contact_sync_consent_<id>`), `syncContacts`
 *    (phone book → the native import; Google / Outlook / iCloud → the hub sync,
 *    `ConnectAppFirst` when the app is off), `importContactFile` (.vcf: size
 *    check, parse, import as `vcf`, `overLimit`), and `readImported` (the
 *    imported rows of those sources, member profiles, true totals),
 *  - `src/lib/phone-verification-client.ts`: `GET /me/phone`,
 *    `POST /me/phone/verification` ({ phone, region }),
 *    `POST /me/phone/verification/confirm` ({ code }).
 * "native" mode reads the whole address book through `src/ports/inbox`
 * (expo-contacts); where the device has none, "file" mode takes a .vcf
 * (expo-document-picker). The browser Contact Picker mode does not exist here.
 */
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../../../auth/client';
import { getGateway } from '../../../auth/gateway';
import { useAuth } from '../../../auth/AuthProvider';
import { deviceStorage } from '../../../identity/device-storage';
import { deviceRegion, phoneContactsAvailable, readPhoneContacts, type PhoneContact } from '../../../ports/inbox';
import { MAX_VCF_BYTES, base64Text, parseVCards } from './vcard';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type ContactSource = 'google' | 'outlook' | 'icloud' | 'phonebook' | 'whatsapp';
export type ConnectedAppId = 'google-contacts' | 'outlook-contacts' | 'iphone-contacts' | 'android-contacts' | string;
export type PhoneImportMode = 'native' | 'file';
export type DeviceImportMethod = 'picker' | 'vcf' | 'native';

export const MAX_DEVICE_CONTACTS = 5000;
export const PREVIEW_LIMIT = 500;

export interface MatchedContact {
  localContact: { id: string; name: string; phone?: string; phoneE164?: string; email?: string };
  platformUser: { user_id: string; display_name: string; avatar_url?: string; handle?: string };
  matchConfidence: 'exact' | 'probable' | 'possible';
}
export interface ImportedContact {
  id: string;
  name: string;
  phone?: string;
  phoneE164?: string;
  email?: string;
}
export interface SyncResult {
  matches: MatchedContact[];
  nonMatches: ImportedContact[];
  totalImported: number;
  totalMatches: number;
  truncated: boolean;
  overLimit?: number;
}

/** Google / Outlook / iCloud still have to be switched on in Connected Apps. */
export class ConnectAppFirst extends Error {
  constructor(public app: ConnectedAppId) {
    super('connect_required');
  }
}

/** A .vcf that is empty or too large. */
export class ContactFileError extends Error {
  constructor(public code: 'too_large' | 'empty') {
    super(`contact_file_${code}`);
  }
}

export const HUB_APP: Partial<Record<ContactSource, ConnectedAppId>> = { google: 'google-contacts', outlook: 'outlook-contacts', icloud: 'iphone-contacts' };
const DB_SOURCE: Partial<Record<ContactSource, string>> = { google: 'google', outlook: 'microsoft', icloud: 'icloud' };

async function gatewayCall(path: string, init: RequestInit = {}): Promise<{ res: Response; json: any }> {
  const res = await getGateway()(path, { ...init, headers: { 'Content-Type': 'application/json', ...((init.headers as Record<string, string> | undefined) ?? {}) } });
  let json: any = {};
  try {
    json = JSON.parse((await res.text()) || '{}');
  } catch {
    json = {};
  }
  return { res, json };
}

async function connectedApps(path: string, init: RequestInit = {}): Promise<any> {
  const { res, json } = await gatewayCall(`/connected-apps${path}`, init);
  if (!res.ok || json?.ok === false) throw new Error(String(json?.error ?? `http_${res.status}`));
  return json;
}

export async function fetchConnectedApps(): Promise<Array<{ id: ConnectedAppId; status: string }>> {
  const json = await connectedApps('');
  return Array.isArray(json.apps) ? json.apps : [];
}

export async function syncConnectedApp(id: ConnectedAppId): Promise<{ ok: boolean; error?: string }> {
  return connectedApps(`/${id}/sync`, { method: 'POST' });
}

export async function importDeviceContacts(contacts: PhoneContact[], method: DeviceImportMethod): Promise<Record<string, unknown>> {
  const json = await connectedApps('/android-contacts/import', { method: 'POST', body: JSON.stringify({ contacts: contacts.slice(0, MAX_DEVICE_CONTACTS), method, region: deviceRegion() }) });
  return json.result ?? {};
}

/** What the hub imported for these sources, shaped for the preview list. */
export async function readImported(sb: SupabaseClient, userId: string, sources: string[]): Promise<SyncResult> {
  if (sources.length === 0) return { matches: [], nonMatches: [], totalImported: 0, totalMatches: 0, truncated: false };
  const contacts = () => sb.from('contacts');
  const [{ data, error, count }, { count: memberCount }] = await Promise.all([
    contacts()
      .select('id, contact_name, contact_phone, contact_email, contact_user_id, is_on_platform, metadata', { count: 'exact' })
      .eq('user_id', userId)
      .in('source', sources)
      .order('is_on_platform', { ascending: false })
      .order('contact_name', { ascending: true })
      .limit(PREVIEW_LIMIT),
    contacts().select('id', { count: 'exact', head: true }).eq('user_id', userId).in('source', sources).eq('is_on_platform', true).not('contact_user_id', 'is', null),
  ]);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ id: string; contact_name: string; contact_phone: string | null; contact_email: string | null; contact_user_id: string | null; is_on_platform: boolean; metadata?: { phones_e164?: string[] } | null }>;
  const memberIds = rows.filter((r) => r.is_on_platform && r.contact_user_id).map((r) => r.contact_user_id as string);
  const profiles: Record<string, { display_name?: string; avatar_url?: string; handle?: string }> = {};
  if (memberIds.length > 0) {
    const { data: prof } = await sb.from('profiles').select('user_id, display_name, avatar_url, handle').in('user_id', memberIds);
    for (const p of (prof as any[] | null) ?? []) profiles[p.user_id] = p;
  }
  const matches: MatchedContact[] = [];
  const nonMatches: ImportedContact[] = [];
  for (const r of rows) {
    const local = { id: r.id, name: r.contact_name, phone: r.contact_phone ?? undefined, phoneE164: r.metadata?.phones_e164?.[0] ?? undefined, email: r.contact_email ?? undefined };
    if (r.is_on_platform && r.contact_user_id) {
      const p = profiles[r.contact_user_id] ?? {};
      matches.push({ localContact: local, platformUser: { user_id: r.contact_user_id, display_name: p.display_name || r.contact_name, avatar_url: p.avatar_url, handle: p.handle }, matchConfidence: 'exact' });
    } else {
      nonMatches.push(local);
    }
  }
  const totalImported = typeof count === 'number' ? Math.max(count, rows.length) : rows.length;
  const totalMatches = typeof memberCount === 'number' ? Math.max(memberCount, matches.length) : matches.length;
  return { matches, nonMatches, totalImported, totalMatches, truncated: totalImported > rows.length };
}

/** "native" when the device can hand over its address book, else "file" (web `phoneImportMode`). */
export function usePhoneImportMode(): PhoneImportMode | null {
  const [mode, setMode] = useState<PhoneImportMode | null>(null);
  useEffect(() => {
    let alive = true;
    void phoneContactsAvailable().then((ok) => (alive ? setMode(ok ? 'native' : 'file') : undefined));
    return () => {
      alive = false;
    };
  }, []);
  return mode;
}

export const consentKey = (userId: string) => `contact_sync_consent_${userId}`;

export function useContactSync() {
  const { user } = useAuth();
  const userId = user?.id;
  const [hasConsented, setHasConsented] = useState(false);

  useEffect(() => {
    if (!userId) return undefined;
    let alive = true;
    void (async () => {
      let stored = false;
      try {
        const { data } = await getSupabase().from('contacts').select('metadata').eq('user_id', userId).limit(1);
        stored = ((data as Array<{ metadata?: Record<string, unknown> | null }> | null) ?? []).some((c) => !!c.metadata?.import_source && !!c.metadata?.consent_given);
      } catch {
        stored = false;
      }
      const local = await deviceStorage.getItem(consentKey(userId));
      if (alive) setHasConsented(stored || local === 'true');
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const recordConsent = useCallback(() => {
    if (!userId) return;
    void deviceStorage.setItem(consentKey(userId), 'true');
    setHasConsented(true);
  }, [userId]);

  const syncContacts = useCallback(
    async (sources: ContactSource[], mode: PhoneImportMode): Promise<SyncResult> => {
      if (!userId) throw new Error('User not authenticated');
      const hubSources: string[] = [];
      const apps = sources.some((s) => Boolean(HUB_APP[s])) ? await fetchConnectedApps() : [];
      for (const source of sources) {
        const appId = HUB_APP[source];
        if (source === 'phonebook') {
          if (mode === 'file') throw new Error('Contact Picker API not available');
        } else if (appId) {
          const app = apps.find((a) => a.id === appId);
          if (!app || app.status !== 'on') throw new ConnectAppFirst(appId);
        }
      }
      for (const source of sources) {
        const appId = HUB_APP[source];
        if (source === 'phonebook') {
          const all = await readPhoneContacts();
          if (all.length === 0) throw new Error('Contact selection cancelled');
          await importDeviceContacts(all, 'native');
          hubSources.push('android');
        } else if (appId) {
          const r = await syncConnectedApp(appId);
          if (!r.ok) throw new Error(r.error ?? 'sync_failed');
          hubSources.push(DB_SOURCE[source] ?? source);
        }
      }
      return readImported(getSupabase(), userId, hubSources);
    },
    [userId],
  );

  const importContactFile = useCallback(
    async (file: { size: number | undefined; base64: string }): Promise<SyncResult> => {
      if (!userId) throw new Error('User not authenticated');
      const size = file.size ?? Math.floor((file.base64.length * 3) / 4);
      if (size > MAX_VCF_BYTES) throw new ContactFileError('too_large');
      const contacts = parseVCards(base64Text(file.base64));
      if (contacts.length === 0) throw new ContactFileError('empty');
      await importDeviceContacts(contacts.slice(0, MAX_DEVICE_CONTACTS), 'vcf');
      const result = await readImported(getSupabase(), userId, ['android']);
      const overLimit = Math.max(contacts.length - MAX_DEVICE_CONTACTS, 0);
      return overLimit > 0 ? { ...result, overLimit } : result;
    },
    [userId],
  );

  return { hasConsented, recordConsent, syncContacts, importContactFile };
}

// ── phone verification (VTID-05096) ─────────────────────────────────────────
export const PHONE_VERIFY_ERRORS = ['INVALID_PHONE', 'NOT_A_MOBILE_NUMBER', 'COUNTRY_NOT_SUPPORTED', 'ACCOUNT_NOT_ELIGIBLE', 'PHONE_IN_USE', 'TOO_MANY_REQUESTS', 'SMS_SEND_FAILED', 'INVALID_CODE', 'CODE_EXPIRED', 'NO_PENDING_CODE', 'TOO_MANY_ATTEMPTS'] as const;
export type PhoneVerifyErrorCode = (typeof PHONE_VERIFY_ERRORS)[number] | 'unknown';
export interface PhoneStatus {
  enabled: boolean;
  verified: boolean;
  phone_masked: string | null;
  resend_after_seconds: number;
}

export class PhoneVerifyRequestError extends Error {
  constructor(
    public status: number,
    public code: PhoneVerifyErrorCode,
  ) {
    super(code);
  }
}

async function phoneCall(path: string, init: RequestInit = {}): Promise<any> {
  const { res, json } = await gatewayCall(`/me/phone${path}`, init);
  if (!res.ok || json?.ok === false) {
    const code = (PHONE_VERIFY_ERRORS as readonly string[]).includes(String(json?.error)) ? (json.error as PhoneVerifyErrorCode) : 'unknown';
    throw new PhoneVerifyRequestError(res.status, code);
  }
  return json;
}

export async function fetchPhoneStatus(): Promise<PhoneStatus> {
  const json = await phoneCall('');
  return {
    enabled: json.enabled === true,
    verified: json.verified === true,
    phone_masked: typeof json.phone_masked === 'string' ? json.phone_masked : null,
    resend_after_seconds: Number.isFinite(json.resend_after_seconds) ? json.resend_after_seconds : 60,
  };
}

export async function sendPhoneCode(phone: string): Promise<{ phone_masked: string | null; resend_after_seconds: number }> {
  const json = await phoneCall('/verification', { method: 'POST', body: JSON.stringify({ phone, region: deviceRegion() }) });
  return { phone_masked: typeof json.phone_masked === 'string' ? json.phone_masked : null, resend_after_seconds: Number.isFinite(json.resend_after_seconds) ? json.resend_after_seconds : 60 };
}

export async function confirmPhoneCode(code: string): Promise<void> {
  await phoneCall('/verification/confirm', { method: 'POST', body: JSON.stringify({ code }) });
}

export const phoneStatusQueryKey = (userId: string | null | undefined) => ['phone-verification-status', userId ?? null] as const;

/** The member's phone status; undefined while loading, on error or while the gateway switch is off. */
export function usePhoneVerificationStatus(): PhoneStatus | undefined {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: phoneStatusQueryKey(user?.id), enabled: !!user?.id, retry: false, staleTime: 60_000, queryFn: fetchPhoneStatus });
  return data?.enabled ? data : undefined;
}
