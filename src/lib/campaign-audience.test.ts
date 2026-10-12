/**
 * VTID-05120: resolveCampaignAudience (supabase/functions/_shared/campaign-audience.ts)
 * against an in-memory fake PostgREST client that records every query.
 * Lives under src/ because _shared has no Deno test harness (same arrangement
 * as erase-user-data.test.ts).
 */
import { describe, it, expect } from 'vitest';
import {
  CampaignAudienceError,
  PROFILE_LOOKUP_CHUNK,
  resolveCampaignAudience,
} from '../../supabase/functions/_shared/campaign-audience';

type Row = Record<string, unknown>;
type Filter = { op: 'eq' | 'in'; column: string; value: unknown };
type Call = { table: string; columns: string; filters: Filter[]; limit?: number };

const OWNER = 'owner-1';
const TENANT = 'tenant-1';

function fakeClient(tables: Record<string, Row[]>, failOn: Record<string, boolean> = {}) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, columns: '', filters: [] };
    calls.push(call);
    const result = () => {
      if (failOn[table]) return { data: null, error: { message: `boom on ${table}` } };
      let rows = (tables[table] ?? []).filter((r) =>
        call.filters.every((f) =>
          f.op === 'eq' ? r[f.column] === f.value : (f.value as unknown[]).includes(r[f.column]),
        ),
      );
      if (call.limit !== undefined) rows = rows.slice(0, call.limit);
      return { data: rows, error: null };
    };
    const builder = {
      select(columns: string) {
        call.columns = columns;
        return builder;
      },
      eq(column: string, value: unknown) {
        call.filters.push({ op: 'eq', column, value });
        return builder;
      },
      in(column: string, value: unknown[]) {
        call.filters.push({ op: 'in', column, value });
        return builder;
      },
      limit(n: number) {
        call.limit = n;
        return builder;
      },
      maybeSingle() {
        const r = result();
        return Promise.resolve({ data: r.data ? r.data[0] ?? null : null, error: r.error });
      },
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve(result()).then(resolve, reject);
      },
    };
    return builder;
  };
  return { client: { from }, calls };
}

const profile = (user_id: string, extra: Row = {}) => ({
  user_id,
  tenant_id: TENANT,
  display_name: `name-${user_id}`,
  full_name: null,
  email: `${user_id}@example.com`,
  phone: `+49${user_id.length}`,
  ...extra,
});

function world(overrides: Partial<Record<string, Row[]>> = {}) {
  return {
    global_community_events: [
      { id: 'ev-own', created_by: OWNER },
      { id: 'ev-other', created_by: 'someone-else' },
    ],
    global_event_participants: [
      { event_id: 'ev-own', user_id: 'att-1', status: 'attending' },
      { event_id: 'ev-own', user_id: 'bot-1', status: 'attending' },
      { event_id: 'ev-other', user_id: 'att-x', status: 'attending' },
    ],
    user_follows: [
      { follower_id: 'fol-1', following_id: OWNER },
      { follower_id: 'actor-1', following_id: OWNER },
      { follower_id: 'fol-elsewhere', following_id: 'someone-else' },
    ],
    profiles: [
      profile('att-1'),
      profile('att-x'),
      profile('bot-1'),
      profile('fol-1'),
      profile('actor-1'),
      profile('fol-other-tenant', { tenant_id: 'tenant-2' }),
    ],
    service_bot_accounts: [{ user_id: 'bot-1' }],
    notification_test_actors: [{ user_id: 'actor-1' }],
    contacts: [
      { id: 'c-1', user_id: OWNER, contact_name: 'Ana', contact_email: 'ana@example.com', contact_phone: '+491' },
      { id: 'c-2', user_id: 'someone-else', contact_name: 'Bo', contact_email: 'bo@example.com', contact_phone: null },
    ],
    campaign_audience_segments: [{ id: 'seg-1', user_id: OWNER, criteria: { any: true } }],
    ...overrides,
  } as Record<string, Row[]>;
}

const resolve = (client: unknown, audience: unknown, tenantId: string | null = TENANT) =>
  resolveCampaignAudience(client, { ownerId: OWNER, tenantId, audience });

describe('VTID-05120 resolveCampaignAudience', () => {
  it('eventAttendees reads global_event_participants.status=attending, never response', async () => {
    const { client, calls } = fakeClient(world());
    const { recipients } = await resolve(client, { eventAttendees: { enabled: true, eventIds: ['ev-own'] } });
    const q = calls.find((c) => c.table === 'global_event_participants')!;
    expect(q.columns).toBe('user_id');
    expect(q.filters).toContainEqual({ op: 'eq', column: 'status', value: 'attending' });
    expect(q.filters.some((f) => f.column === 'response')).toBe(false);
    expect(recipients.map((r) => r.email)).toEqual(['att-1@example.com']);
    expect(recipients[0]).toMatchObject({ source: 'event_attendees', source_id: 'ev-own' });
  });

  it('yourFollowers reads user_follows.following_id = owner', async () => {
    const { client, calls } = fakeClient(world());
    const { recipients, counts } = await resolve(client, { yourFollowers: { enabled: true } });
    const q = calls.find((c) => c.table === 'user_follows')!;
    expect(q.columns).toBe('follower_id');
    expect(q.filters).toEqual([{ op: 'eq', column: 'following_id', value: OWNER }]);
    expect(recipients.map((r) => r.email)).toEqual(['fol-1@example.com']);
    expect(counts.your_followers).toBe(1);
    expect(calls.some((c) => c.table === 'social_connections')).toBe(false);
  });

  it('looks profiles up by email/phone with a real tenant_id row filter', async () => {
    const tables = world({ user_follows: [
      { follower_id: 'fol-1', following_id: OWNER },
      { follower_id: 'fol-other-tenant', following_id: OWNER },
    ] });
    const { client, calls } = fakeClient(tables);
    const { recipients } = await resolve(client, { yourFollowers: { enabled: true } });
    const q = calls.find((c) => c.table === 'profiles')!;
    expect(q.columns).toBe('user_id, display_name, full_name, email, phone');
    expect(q.columns).not.toMatch(/contact_email|contact_phone/);
    expect(q.filters).toContainEqual({ op: 'eq', column: 'tenant_id', value: TENANT });
    expect(q.filters.some((f) => f.column.includes('.'))).toBe(false);
    expect(recipients.map((r) => r.email)).toEqual(['fol-1@example.com']);
  });

  it('chunks the profile lookup', async () => {
    const many = Array.from({ length: PROFILE_LOOKUP_CHUNK + 3 }, (_, i) => ({ follower_id: `f${i}`, following_id: OWNER }));
    const { client, calls } = fakeClient(world({ user_follows: many }));
    await resolve(client, { yourFollowers: { enabled: true } });
    const lookups = calls.filter((c) => c.table === 'profiles');
    expect(lookups).toHaveLength(2);
    expect((lookups[0].filters.find((f) => f.op === 'in')!.value as unknown[]).length).toBe(PROFILE_LOOKUP_CHUNK);
  });

  it('excludes service_bot_accounts and notification_test_actors from attendees, followers and segments', async () => {
    const { client } = fakeClient(world());
    const { recipients, counts } = await resolve(client, {
      eventAttendees: { enabled: true, eventIds: ['ev-own'] },
      yourFollowers: { enabled: true },
      segments: { enabled: true, segmentIds: ['seg-1'] },
    });
    const names = recipients.map((r) => r.name);
    expect(names).not.toContain('name-bot-1');
    expect(names).not.toContain('name-actor-1');
    expect(counts.event_attendees).toBe(1);
    expect(counts.your_followers).toBe(1);
    // segment: att-1, att-x, fol-1 (bot-1 and actor-1 dropped; tenant-2 not selected)
    expect(counts.segments).toBe(3);
    expect(counts.excluded_accounts).toBe(4);
  });

  it('never queries a profile id that is on an allowlist', async () => {
    const { client, calls } = fakeClient(world());
    await resolve(client, { eventAttendees: { enabled: true, eventIds: ['ev-own'] }, yourFollowers: { enabled: true } });
    const ids = calls
      .filter((c) => c.table === 'profiles')
      .flatMap((c) => c.filters.filter((f) => f.op === 'in').flatMap((f) => f.value as string[]));
    expect(ids).not.toContain('bot-1');
    expect(ids).not.toContain('actor-1');
  });

  it.each([
    ['service_bot_accounts', { yourFollowers: { enabled: true } }],
    ['notification_test_actors', { yourFollowers: { enabled: true } }],
    ['global_community_events', { eventAttendees: { enabled: true, eventIds: ['ev-own'] } }],
    ['global_event_participants', { eventAttendees: { enabled: true, eventIds: ['ev-own'] } }],
    ['user_follows', { yourFollowers: { enabled: true } }],
    ['profiles', { yourFollowers: { enabled: true } }],
    ['contacts', { vitanaContacts: { enabled: true, contactIds: ['c-1'] } }],
    ['campaign_audience_segments', { segments: { enabled: true, segmentIds: ['seg-1'] } }],
  ])('a query error on %s throws CampaignAudienceError naming the step', async (table, audience) => {
    const { client } = fakeClient(world(), { [table]: true });
    const err = await resolve(client, audience).catch((e) => e);
    expect(err).toBeInstanceOf(CampaignAudienceError);
    expect(typeof err.step).toBe('string');
    expect(err.step.length).toBeGreaterThan(0);
    expect(err.message).toContain(`boom on ${table}`);
  });

  it('a member audience without a tenant throws (fail closed)', async () => {
    const { client } = fakeClient(world());
    const err = await resolve(client, { yourFollowers: { enabled: true } }, null).catch((e) => e);
    expect(err).toBeInstanceOf(CampaignAudienceError);
    expect(err.step).toBe('tenant');
  });

  it('an event the owner does not own contributes nothing', async () => {
    const { client, calls } = fakeClient(world());
    const { recipients } = await resolve(client, { eventAttendees: { enabled: true, eventIds: ['ev-other'] } });
    expect(recipients).toEqual([]);
    expect(calls.some((c) => c.table === 'global_event_participants')).toBe(false);
  });

  it('eventAttendees alone does not add the organizer\'s followers', async () => {
    const { client, calls } = fakeClient(world());
    const { recipients, counts } = await resolve(client, { eventAttendees: { enabled: true, eventIds: ['ev-own'] } });
    expect(calls.some((c) => c.table === 'user_follows' || c.table === 'social_connections')).toBe(false);
    expect(recipients.every((r) => r.source === 'event_attendees')).toBe(true);
    expect(counts.your_followers).toBe(0);
  });

  it('vitanaContacts uses contacts.contact_*, scoped to the owner, with no member lookup or allowlist query', async () => {
    const { client, calls } = fakeClient(world());
    const { recipients, counts } = await resolve(
      client,
      { vitanaContacts: { enabled: true, contactIds: ['c-1', 'c-2'] } },
      null,
    );
    expect(recipients).toEqual([
      { name: 'Ana', email: 'ana@example.com', phone: '+491', source: 'vitana_contacts' },
    ]);
    expect(counts.vitana_contacts).toBe(1);
    expect(calls.map((c) => c.table)).toEqual(['contacts']);
    expect(calls[0].filters).toContainEqual({ op: 'eq', column: 'user_id', value: OWNER });
  });

  it('csv and manual entries pass through unchanged and make no query', async () => {
    const { client, calls } = fakeClient(world());
    const { recipients, counts } = await resolve(client, {
      csvUpload: { enabled: true, data: [{ name: 'Csv', email: 'csv@example.com', phone: '+1' }] },
      manualContacts: { enabled: true, data: [{ email: 'm@example.com' }] },
    });
    expect(calls).toEqual([]);
    expect(recipients).toEqual([
      { name: 'Csv', email: 'csv@example.com', phone: '+1', whatsapp_number: '+1', source: 'csv_upload' },
      { name: 'Unknown', email: 'm@example.com', phone: undefined, whatsapp_number: undefined, source: 'manual_entry' },
    ]);
    expect(counts).toMatchObject({ csv_upload: 1, manual_entry: 1, total: 2 });
  });

  it('an empty or missing audience resolves to nothing without querying', async () => {
    const { client, calls } = fakeClient(world());
    expect((await resolve(client, null)).recipients).toEqual([]);
    expect((await resolve(client, { vitanaContacts: true })).recipients).toEqual([]);
    expect(calls).toEqual([]);
  });
});
