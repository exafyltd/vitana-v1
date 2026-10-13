// deno-lint-ignore-file no-explicit-any
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * VTID-05120: resolve a campaign's audience into recipients.
 *
 * queue-campaign-recipients used to read columns that do not exist
 * (`global_event_participants.response`, `profiles.contact_email`,
 * `social_connections.follower_id`), embed `profiles` over FKs that do not
 * exist, and drop every error, so every audience resolved to zero recipients.
 * This module reads the real tables in two steps (ids first, then one
 * `profiles` lookup filtered by tenant as a real row filter), never embeds,
 * and throws `CampaignAudienceError(step, error)` on any query error: this is
 * a send path, so it fails closed.
 *
 * Member-sourced audiences (event attendees, your followers, segments) never
 * include a registered test, service or automation account
 * (`service_bot_accounts`, `notification_test_actors`; CLAUDE.md rules 43-45).
 * The owner's own lists (Vitana contacts, CSV, manual entries) are not member
 * lookups and skip that step.
 *
 * It takes an injected supabase-js client and has no URL imports, so Vitest
 * imports it directly (src/lib/campaign-audience.test.ts).
 */

export interface CampaignRecipient {
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp_number?: string | null;
  source: string;
  source_id?: string;
}

export interface CampaignAudienceCounts {
  event_attendees: number;
  your_followers: number;
  vitana_contacts: number;
  csv_upload: number;
  manual_entry: number;
  segments: number;
  excluded_accounts: number;
  total: number;
}

export interface ResolveCampaignAudienceInput {
  ownerId: string;
  tenantId: string | null;
  audience: any;
}

export class CampaignAudienceError extends Error {
  readonly step: string;
  readonly original: unknown;
  constructor(step: string, cause: unknown) {
    const detail = (cause as { message?: string } | null)?.message ?? String(cause);
    super(`campaign audience step "${step}" failed: ${detail}`);
    this.name = 'CampaignAudienceError';
    this.step = step;
    this.original = cause;
  }
}

export const PROFILE_LOOKUP_CHUNK = 500;

/** True when the audience selects members of the community (needs a tenant). */
export function hasMemberAudience(audience: any): boolean {
  return Boolean(
    (audience?.eventAttendees?.enabled && audience.eventAttendees.eventIds?.length > 0) ||
      audience?.yourFollowers?.enabled ||
      (audience?.segments?.enabled && audience.segments.segmentIds?.length > 0),
  );
}

async function run<T = any>(step: string, query: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new CampaignAudienceError(step, error);
  return data;
}

/** PostgREST caps a response (max_rows, 1000 by default), so member lists are read page by page. */
export const MEMBER_PAGE_SIZE = 1000;

async function runAllPages<T = any>(
  step: string,
  buildQuery: () => { order: (column: string) => any },
  orderColumn: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += MEMBER_PAGE_SIZE) {
    const page = await run<T[]>(step, buildQuery().order(orderColumn).range(from, from + MEMBER_PAGE_SIZE - 1));
    rows.push(...(page ?? []));
    if (!page || page.length < MEMBER_PAGE_SIZE) return rows;
  }
}

async function loadExcludedAccountIds(client: any): Promise<Set<string>> {
  const [bots, testActors] = await Promise.all([
    run<Array<{ user_id: string | null }>>('service_bot_accounts', client.from('service_bot_accounts').select('user_id')),
    run<Array<{ user_id: string | null }>>('notification_test_actors', client.from('notification_test_actors').select('user_id')),
  ]);
  const excluded = new Set<string>();
  for (const r of [...(bots ?? []), ...(testActors ?? [])]) {
    if (r?.user_id) excluded.add(String(r.user_id));
  }
  return excluded;
}

export async function resolveCampaignAudience(
  client: any,
  { ownerId, tenantId, audience }: ResolveCampaignAudienceInput,
): Promise<{ recipients: CampaignRecipient[]; counts: CampaignAudienceCounts }> {
  const counts: CampaignAudienceCounts = {
    event_attendees: 0,
    your_followers: 0,
    vitana_contacts: 0,
    csv_upload: 0,
    manual_entry: 0,
    segments: 0,
    excluded_accounts: 0,
    total: 0,
  };
  const recipients: CampaignRecipient[] = [];

  const memberAudience = hasMemberAudience(audience);
  if (memberAudience && !tenantId) {
    throw new CampaignAudienceError('tenant', new Error('campaign owner has no tenant'));
  }
  const excluded = memberAudience ? await loadExcludedAccountIds(client) : new Set<string>();

  // Member ids with the audience they came from; profiles are looked up once.
  const memberEntries: Array<{ userId: string; source: 'event_attendees' | 'your_followers'; sourceId: string }> = [];

  // Event attendees: only the owner's own events, only status='attending'.
  if (audience?.eventAttendees?.enabled && audience.eventAttendees.eventIds?.length > 0) {
    for (const eventId of audience.eventAttendees.eventIds) {
      const ownedEvent = await run(
        'event_owner_check',
        client
          .from('global_community_events')
          .select('id')
          .eq('id', eventId)
          .eq('created_by', ownerId)
          .maybeSingle(),
      );
      if (!ownedEvent) continue;

      const attendees = await runAllPages<{ user_id: string | null }>(
        'event_attendees',
        () =>
          client
            .from('global_event_participants')
            .select('user_id')
            .eq('event_id', eventId)
            .eq('status', 'attending'),
        'user_id',
      );
      for (const a of attendees ?? []) {
        if (a?.user_id) memberEntries.push({ userId: String(a.user_id), source: 'event_attendees', sourceId: eventId });
      }
    }
  }

  // Your followers: the campaign owner's followers.
  if (audience?.yourFollowers?.enabled) {
    const followers = await runAllPages<{ follower_id: string | null }>(
      'your_followers',
      () => client.from('user_follows').select('follower_id').eq('following_id', ownerId),
      'follower_id',
    );
    for (const f of followers ?? []) {
      if (f?.follower_id) memberEntries.push({ userId: String(f.follower_id), source: 'your_followers', sourceId: ownerId });
    }
  }

  if (memberEntries.length > 0) {
    const kept = memberEntries.filter((e) => !excluded.has(e.userId));
    counts.excluded_accounts += memberEntries.length - kept.length;

    const ids = [...new Set(kept.map((e) => e.userId))];
    const profileById = new Map<string, any>();
    for (let i = 0; i < ids.length; i += PROFILE_LOOKUP_CHUNK) {
      const chunk = ids.slice(i, i + PROFILE_LOOKUP_CHUNK);
      const profiles = await run<any[]>(
        'member_profiles',
        client
          .from('profiles')
          .select('user_id, display_name, full_name, email, phone')
          .in('user_id', chunk)
          .eq('tenant_id', tenantId),
      );
      for (const p of profiles ?? []) {
        if (p?.user_id) profileById.set(String(p.user_id), p);
      }
    }

    for (const entry of kept) {
      const profile = profileById.get(entry.userId);
      if (!profile) continue; // not a member of the campaign's tenant
      recipients.push({
        name: profile.display_name || profile.full_name || (entry.source === 'event_attendees' ? 'Event Attendee' : 'Follower'),
        email: profile.email ?? null,
        phone: profile.phone ?? null,
        whatsapp_number: profile.phone ?? null,
        source: entry.source,
        source_id: entry.sourceId,
      });
      counts[entry.source] += 1;
    }
  }

  // Vitana contacts: the owner's own address book rows.
  if (audience?.vitanaContacts?.enabled && audience.vitanaContacts.contactIds?.length > 0) {
    const contacts = await run<any[]>(
      'vitana_contacts',
      client
        .from('contacts')
        .select('id, contact_name, contact_email, contact_phone')
        .eq('user_id', ownerId)
        .in('id', audience.vitanaContacts.contactIds),
    );
    for (const c of contacts ?? []) {
      recipients.push({
        name: c.contact_name,
        email: c.contact_email,
        phone: c.contact_phone,
        source: 'vitana_contacts',
      });
      counts.vitana_contacts += 1;
    }
  }

  // CSV uploads
  if (audience?.csvUpload?.enabled && audience.csvUpload.data?.length > 0) {
    for (const row of audience.csvUpload.data) {
      recipients.push({
        name: row.name || 'Unknown',
        email: row.email,
        phone: row.phone,
        whatsapp_number: row.whatsapp_number || row.phone, // Use phone as fallback
        source: 'csv_upload',
      });
      counts.csv_upload += 1;
    }
  }

  // Manual entry
  if (audience?.manualContacts?.enabled && audience.manualContacts.data?.length > 0) {
    for (const contact of audience.manualContacts.data) {
      recipients.push({
        name: contact.name || 'Unknown',
        email: contact.email,
        phone: contact.phone,
        whatsapp_number: contact.whatsapp_number || contact.phone,
        source: 'manual_entry',
      });
      counts.manual_entry += 1;
    }
  }

  // Community segments: criteria are not evaluated yet (simplified, unchanged);
  // the rows carry no email or phone, so nothing from here is queued.
  if (audience?.segments?.enabled && audience.segments.segmentIds?.length > 0) {
    for (const segmentId of audience.segments.segmentIds) {
      const segment = await run<any>(
        'segment',
        client
          .from('campaign_audience_segments')
          .select('criteria')
          .eq('id', segmentId)
          .eq('user_id', ownerId)
          .maybeSingle(),
      );
      if (!segment?.criteria) continue;

      const profiles = await run<any[]>(
        'segment_profiles',
        client
          .from('profiles')
          .select('user_id, display_name, full_name')
          .eq('tenant_id', tenantId)
          .limit(100),
      );
      for (const p of profiles ?? []) {
        if (p?.user_id && excluded.has(String(p.user_id))) {
          counts.excluded_accounts += 1;
          continue;
        }
        recipients.push({
          name: p.display_name || p.full_name || 'Unknown',
          email: null, // Would need to fetch from user preferences
          phone: null,
          source: `segment_${segmentId}`,
        });
        counts.segments += 1;
      }
    }
  }

  counts.total = recipients.length;
  return { recipients, counts };
}
