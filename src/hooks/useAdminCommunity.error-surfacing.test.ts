/**
 * useAdminCommunity.ts — community-admin query error visibility fix.
 *
 * The gateway's `/api/v1/admin/tenants/:tenantId/community/{meetups,groups,
 * live-rooms,creators}` routes all report a Supabase query failure the same
 * way: HTTP 200 with `{ ok: true, <key>: [], error: "<message>" }` — the
 * empty array is there so old clients don't crash, but it is
 * indistinguishable from a genuinely empty table unless `error` is
 * inspected. `adminFetch` (src/lib/admin-api.ts) only throws on a non-2xx
 * response or a network failure, so it never surfaces this.
 *
 * Every hook here previously did `return json.<key> || []` (some inside a
 * try/catch that ALSO swallowed adminFetch's own thrown errors, e.g. an
 * expired session) with no check of `json.error` at all. Concretely, this
 * meant `useCommunityCreators()` returned `[]` identically whether the
 * `creator_profiles` table had zero rows or didn't exist at all (confirmed
 * live 2026-08-29 via `to_regclass('public.creator_profiles')` returning
 * null) — and its one real caller, src/pages/admin/community/Creators.tsx,
 * rendered "There are no community creators yet." with no indication
 * anything had failed. `Meetups.tsx` already destructured `isError`/`error`
 * from its query expecting this to work, but the hook itself made that
 * branch dead code.
 *
 * Fixed: each hook now throws when `json.error` is present, and the
 * try/catch that discarded adminFetch's own thrown errors is removed, so
 * both failure classes surface through react-query's `isError`/`error`
 * instead of a confidently-empty array. Creators.tsx / GroupsNew.tsx /
 * LiveRooms.tsx were updated to render that state, matching Meetups.tsx's
 * pre-existing pattern.
 *
 * Pinned at the source level — matching this repo's own
 * useTenant.error-logging.test.ts / useCalendarEvents.idempotency-error-
 * logging.test.ts precedent for hook files with react-query/auth
 * entanglement and no render-test harness.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useAdminCommunity.ts'), 'utf8');

describe('useAdminCommunity — community-admin query error surfacing', () => {
  const hooks = [
    { name: 'useCommunityMeetups', key: 'meetups' },
    { name: 'useCommunityGroups', key: 'groups' },
    { name: 'useCommunityLiveRooms', key: 'rooms' },
    { name: 'useCommunityCreators', key: 'creators' },
  ];

  for (const { name, key } of hooks) {
    it(`${name} throws on json.error instead of silently returning an empty/partial array`, () => {
      const idx = SRC.indexOf(`export function ${name}(`);
      expect(idx).toBeGreaterThan(-1);
      const body = SRC.slice(idx, idx + 500);

      expect(body).toContain('if (json.error) throw new Error(json.error);');
      expect(body).toContain(`return json.${key} || [];`);

      // The throw must come BEFORE the fallback-array return, or a real
      // DB error would still resolve to `[]` instead of rejecting.
      const throwIdx = body.indexOf('if (json.error) throw new Error(json.error);');
      const returnIdx = body.indexOf(`return json.${key} || [];`);
      expect(throwIdx).toBeGreaterThan(-1);
      expect(returnIdx).toBeGreaterThan(throwIdx);
    });

    it(`${name} no longer wraps its adminFetch call in a try/catch that discards a real thrown error into []`, () => {
      const idx = SRC.indexOf(`export function ${name}(`);
      const nextExportIdx = SRC.indexOf('\nexport function ', idx + 1);
      const body = SRC.slice(idx, nextExportIdx === -1 ? SRC.length : nextExportIdx);

      expect(body).not.toContain('try {');
      expect(body).not.toContain('catch { return []; }');
    });
  }
});
