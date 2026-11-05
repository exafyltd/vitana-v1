/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the data of the
 * inbox's Contacts pill (web VTID-04440), re-implemented natively from the
 * class-B web modules (web Supabase client / community gateway):
 *  - `useContacts` — `src/hooks/useContacts.ts`: the member's `contacts`
 *    (`select('*').eq('user_id', me).order('contact_name', asc)`), members
 *    enriched from `profiles` (`user_id, display_name, avatar_url, handle`)
 *    and, for those without a row or an avatar, `global_community_profiles`;
 *    realtime `contacts-changes` (every event on the member's rows) refetches
 *    once after a burst (600 ms) and toasts when a contact joined;
 *    `addContact` (`check_phone_on_platform` for a typed number, then the
 *    insert), `deleteContact`, `searchContacts`;
 *  - the invite (`src/lib/contact-invite-links.ts`): `GET /api/v1/invites/me`
 *    (cached per member), the channel list and URLs (wa.me / sms: / mailto: /
 *    share), `markContactInvited` (`invite_sent_at` on the member's row);
 *  - `removeDeviceContacts` (`src/lib/connected-apps-client.ts`):
 *    `DELETE /api/v1/connected-apps/android-contacts`.
 * The member search of "Add contact" is the two directory RPCs of
 * `./directory` (member-listing exclusion inherited, rule 45).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { notify, notifyError } from '../../../ports/ui';
import { getSupabase } from '../../../auth/client';
import { getGateway } from '../../../auth/gateway';
import { useAuth } from '../../../auth/AuthProvider';
import { subscribeChannel } from './realtime';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Contact {
  id: string;
  user_id: string;
  contact_user_id?: string | null;
  contact_phone?: string | null;
  contact_name: string;
  contact_email?: string | null;
  is_on_platform: boolean;
  invite_sent_at?: string | null;
  source?: string | null;
  created_at?: string;
  updated_at?: string;
  metadata?: any;
  contact_profile?: { user_id: string; display_name?: string; avatar_url?: string; handle?: string };
}

export type NewContact = { contact_name: string; contact_phone?: string; contact_email?: string; contact_user_id?: string };

export const CONTACTS_REFETCH_DEBOUNCE_MS = 600;

async function fetchContactRows(sb: SupabaseClient, userId: string): Promise<Contact[]> {
  const { data, error } = await sb.from('contacts').select('*').eq('user_id', userId).order('contact_name', { ascending: true });
  if (error) throw error;
  const rows = (data as Contact[] | null) ?? [];
  const ids = rows.filter((c) => c.is_on_platform && c.contact_user_id).map((c) => c.contact_user_id as string);
  const map: Record<string, any> = {};
  if (ids.length > 0) {
    const { data: prof } = await sb.from('profiles').select('user_id, display_name, avatar_url, handle').in('user_id', ids);
    for (const p of (prof as any[] | null) ?? []) map[p.user_id] = { ...p, source: 'profiles' };
    const needGlobal = ids.filter((id) => !map[id] || !map[id].avatar_url);
    if (needGlobal.length > 0) {
      const { data: global, error: globalError } = await sb.from('global_community_profiles').select('user_id, display_name, avatar_url').in('user_id', needGlobal);
      if (!globalError) {
        for (const gp of (global as any[] | null) ?? []) {
          const existing = map[gp.user_id];
          map[gp.user_id] = existing ? { ...existing, avatar_url: existing.avatar_url || gp.avatar_url } : { ...gp, source: 'global' };
        }
      }
    }
  }
  return rows.map((c) => ({ ...c, contact_profile: c.contact_user_id && map[c.contact_user_id] ? map[c.contact_user_id] : undefined }));
}

export function useContacts() {
  const { user } = useAuth();
  const userId = user?.id;
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const alive = useRef(true);

  const fetchContacts = useCallback(async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      const rows = await fetchContactRows(getSupabase(), userId);
      if (alive.current) setContacts(rows);
    } catch {
      notifyError('toasts.hooks.errorLoadingContacts');
    } finally {
      if (alive.current) setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    alive.current = true;
    if (!userId) return undefined;
    void fetchContacts();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeChannel(getSupabase(), 'contacts-changes', [
      {
        kind: 'postgres',
        event: '*',
        table: 'contacts',
        filter: `user_id=eq.${userId}`,
        handler: (payload: any) => {
          if (payload?.eventType === 'UPDATE' && payload.new?.is_on_platform && payload.old && !payload.old.is_on_platform) notify('toasts.hooks.contactJoinedVitana');
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            timer = null;
            void fetchContacts();
          }, CONTACTS_REFETCH_DEBOUNCE_MS);
        },
      },
    ]);
    return () => {
      alive.current = false;
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [userId, fetchContacts]);

  const addContact = useCallback(
    async (input: NewContact) => {
      if (!userId) return null;
      const sb = getSupabase();
      try {
        let isOnPlatform = !!input.contact_user_id;
        let contactUserId = input.contact_user_id || null;
        if (!isOnPlatform && input.contact_phone) {
          const { data: found } = await sb.rpc('check_phone_on_platform', { phone_number: input.contact_phone });
          const match = Array.isArray(found) ? (found[0] as { user_id?: string } | undefined) : null;
          if (match?.user_id && match.user_id !== userId) {
            isOnPlatform = true;
            contactUserId = match.user_id;
          }
        }
        const { data, error } = await sb
          .from('contacts')
          .insert({ user_id: userId, contact_name: input.contact_name, contact_phone: input.contact_phone, contact_email: input.contact_email, is_on_platform: isOnPlatform, contact_user_id: contactUserId })
          .select()
          .single();
        if (error) throw error;
        notify(isOnPlatform ? 'mailhub.findFriends.added.onPlatformTitle' : 'mailhub.findFriends.added.savedTitle', isOnPlatform ? 'mailhub.findFriends.added.onPlatformBody' : 'mailhub.findFriends.added.savedBody', { name: input.contact_name });
        await fetchContacts();
        return data;
      } catch {
        notifyError('toasts.hooks.failedAddContact');
        return null;
      }
    },
    [userId, fetchContacts],
  );

  const deleteContact = useCallback(
    async (contactId: string) => {
      if (!userId) return false;
      try {
        const { error } = await getSupabase().from('contacts').delete().eq('id', contactId).eq('user_id', userId);
        if (error) throw error;
        notify('toasts.hooks.contactDeleted', 'toasts.hooks.contactHasRemovedFromYourList');
        await fetchContacts();
        return true;
      } catch {
        notifyError('toasts.hooks.failedDeleteContact');
        return false;
      }
    },
    [userId, fetchContacts],
  );

  const searchContacts = useCallback(
    (query: string) => {
      const lower = query.toLowerCase();
      return contacts.filter((c) => c.contact_name.toLowerCase().includes(lower) || c.contact_phone?.includes(query) || c.contact_email?.toLowerCase().includes(lower));
    },
    [contacts],
  );

  return {
    contacts,
    platformContacts: contacts.filter((c) => c.is_on_platform),
    nonPlatformContacts: contacts.filter((c) => !c.is_on_platform),
    isLoading,
    addContact,
    deleteContact,
    searchContacts,
    refetch: fetchContacts,
  };
}

/** `ContactListItem`: the member's profile name / avatar for a member, the stored name otherwise. */
export function contactDisplay(c: Contact): { name: string; avatarUrl?: string; info?: string | null } {
  return {
    name: c.is_on_platform && c.contact_profile?.display_name ? c.contact_profile.display_name : c.contact_name,
    avatarUrl: c.is_on_platform && c.contact_profile?.avatar_url ? c.contact_profile.avatar_url : undefined,
    info: c.contact_phone || c.contact_email,
  };
}

// ── invite ───────────────────────────────────────────────────────────────
export type InviteChannel = 'whatsapp' | 'sms' | 'email' | 'share';
export interface InviteTarget {
  id: string;
  name: string;
  phoneE164?: string | null;
  phone?: string | null;
  email?: string | null;
}

let cachedLink: { userId: string; url: string } | null = null;

async function gatewayJson(path: string, init: RequestInit = {}): Promise<{ res: Response; json: Record<string, any> }> {
  const res = await getGateway()(path, init);
  let json: Record<string, any> = {};
  try {
    json = JSON.parse((await res.text()) || '{}');
  } catch {
    json = {};
  }
  return { res, json };
}

/** The member's one reusable invite link (`GET /api/v1/invites/me`), fetched once per session. */
export async function fetchMyInviteLink(userId: string): Promise<string> {
  if (cachedLink?.userId === userId) return cachedLink.url;
  const { res, json } = await gatewayJson('/invites/me', { headers: { 'X-Vitana-Active-Role': 'community' } });
  if (!res.ok || !json.ok || !json.url) throw new Error(json.error ?? 'invite_link_unavailable');
  cachedLink = { userId, url: String(json.url) };
  return cachedLink.url;
}

export function whatsappNumber(target: InviteTarget): string | null {
  const trimmed = (target.phoneE164 || target.phone || '').trim();
  if (trimmed.startsWith('+')) return trimmed.replace(/\D/g, '') || null;
  if (trimmed.startsWith('00')) return trimmed.replace(/\D/g, '').slice(2) || null;
  return null;
}

export function availableChannels(target: InviteTarget): InviteChannel[] {
  const out: InviteChannel[] = [];
  if (target.phone || target.phoneE164) out.push('whatsapp', 'sms');
  if (target.email) out.push('email');
  out.push('share');
  return out;
}

export function inviteUrl(channel: InviteChannel, target: InviteTarget, message: string): string | null {
  const text = encodeURIComponent(message);
  switch (channel) {
    case 'whatsapp': {
      const n = whatsappNumber(target);
      return n ? `https://wa.me/${n}?text=${text}` : `https://wa.me/?text=${text}`;
    }
    case 'sms':
      return `sms:${(target.phoneE164 || target.phone || '').replace(/[^\d+]/g, '')}?&body=${text}`;
    case 'email':
      return `mailto:${encodeURIComponent(target.email ?? '')}?body=${text}`;
    default:
      return null;
  }
}

export async function markContactInvited(userId: string, contactId: string): Promise<void> {
  const { error } = await getSupabase().from('contacts').update({ invite_sent_at: new Date().toISOString() }).eq('id', contactId).eq('user_id', userId);
  if (error) throw error;
}

/** `DELETE /api/v1/connected-apps/android-contacts` (everything imported from the phone). */
export async function removeDeviceContacts(): Promise<void> {
  const { res, json } = await gatewayJson('/connected-apps/android-contacts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
  if (!res.ok || json.ok === false) throw new Error(String(json.error ?? `http_${res.status}`));
}

/** Test seam: a fresh app session. */
export function __resetInviteLinkCacheForTests(): void {
  cachedLink = null;
}
