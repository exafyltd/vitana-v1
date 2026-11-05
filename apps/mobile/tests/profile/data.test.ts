/**
 * VTID-05429 (Native Wave 2, profile lane) — the pure parts of the native
 * profile data layer: the visibility defaults pinned to the web constant, the
 * row mapping (web ProfileProvider), the request builders (the exact UPDATE
 * each web drawer sends), the share URL path and the card param.
 */
import './mocks';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  DEFAULT_ACCOUNT_VISIBILITY,
  NEXT_TIER,
  buildAboutUpdate,
  buildAccountUpdate,
  buildIdentityUpdate,
  buildVisibilityUpdate,
  displayNameOf,
  mapProfileRow,
  tierFor,
} from '../../src/screens/profile/data/profile';
import { cardSideOf, profileSharePath, shareHash } from '../../src/screens/profile/MyProfileScreen';

const NOW = new Date('2026-11-01T12:00:00.000Z');

describe('visibility defaults', () => {
  it('mirror the web DEFAULT_ACCOUNT_VISIBILITY exactly (src/types/profile.ts)', () => {
    const src = readFileSync(join(__dirname, '../../../../src/types/profile.ts'), 'utf8');
    const block = src.slice(src.indexOf('DEFAULT_ACCOUNT_VISIBILITY: AccountVisibility = {'));
    const body = block.slice(block.indexOf('{') + 1, block.indexOf('};'));
    const web: Record<string, string> = {};
    for (const m of body.matchAll(/^\s*'?([A-Za-z.]+)'?:\s*'(private|connections|public)'/gm)) web[m[1]] = m[2];
    expect(Object.keys(web).length).toBeGreaterThan(30);
    expect(DEFAULT_ACCOUNT_VISIBILITY).toEqual(web);
  });

  it('tierFor: stored tier, else default, else private; NEXT_TIER cycles', () => {
    expect(tierFor({ city: 'public' }, 'city')).toBe('public');
    expect(tierFor({ city: 'bogus' }, 'city')).toBe('connections');
    expect(tierFor({}, 'partnerPreferences')).toBe('private');
    expect([NEXT_TIER.private, NEXT_TIER.connections, NEXT_TIER.public]).toEqual(['connections', 'public', 'private']);
  });
});

describe('mapProfileRow (web ProfileProvider)', () => {
  it('composes the display name from first + last, then display_name, full_name, email prefix, "User"', () => {
    expect(displayNameOf({ first_name: 'Ana', last_name: 'B', display_name: 'X' }, 'a@x.org')).toBe('Ana B');
    expect(displayNameOf({ display_name: 'Disp' }, 'a@x.org')).toBe('Disp');
    expect(displayNameOf({ full_name: 'Full' }, 'a@x.org')).toBe('Full');
    expect(displayNameOf(null, 'mail@x.org')).toBe('mail');
    expect(displayNameOf(null, undefined)).toBe('User');
  });

  it('merges stored visibility over the defaults and keeps no-row as hasRow=false', () => {
    const p = mapProfileRow({ id: 'p', handle: 'h', account_visibility: { email: 'public' }, instagram_url: 'https://i.example.org/h' }, 'u');
    expect(p.account.visibility.email).toBe('public');
    expect(p.account.visibility.city).toBe('connections');
    expect(p.social).toEqual({ instagram: 'https://i.example.org/h' });
    expect(p.hasRow).toBe(true);
    const empty = mapProfileRow(null, 'u', 'z@x.org');
    expect(empty).toEqual(expect.objectContaining({ hasRow: false, profileId: 'u', displayName: 'z', links: [], languages: [] }));
    expect(empty.account.accountType).toBe('Community');
  });
});

describe('request builders (one UPDATE on the own profiles row)', () => {
  const current = mapProfileRow({ id: 'p', avatar_url: 'https://cdn.example.org/a.png', avatar_offset_x: 30, avatar_offset_y: 70 }, 'u-1');

  it('identity — the IdentityDrawer payload, avatar carried from the loaded profile', () => {
    expect(buildIdentityUpdate('u-1', { displayName: 'A', handle: 'a', longevityArchetype: 'Z' }, current, NOW)).toEqual({
      table: 'profiles',
      values: {
        display_name: 'A',
        handle: 'a',
        avatar_url: 'https://cdn.example.org/a.png',
        avatar_offset_x: 30,
        avatar_offset_y: 70,
        longevity_archetype: 'Z',
        updated_at: '2026-11-01T12:00:00.000Z',
      },
      match: { user_id: 'u-1' },
    });
  });

  it('about — bio, location, links, languages', () => {
    expect(buildAboutUpdate('u-1', { bio: 'b', location: 'l', links: [], languages: ['de'] }, NOW).values).toEqual({
      bio: 'b',
      location: 'l',
      links: [],
      languages: ['de'],
      updated_at: '2026-11-01T12:00:00.000Z',
    });
  });

  it('account — empty → null; display_name only when first/last compose to something', () => {
    expect(buildAccountUpdate('u-1', { firstName: '', lastName: '', phone: ' ', country: 'DE', city: '' }, NOW).values).toEqual({
      first_name: null,
      last_name: null,
      phone: null,
      country: 'DE',
      city: null,
      updated_at: '2026-11-01T12:00:00.000Z',
    });
    expect(buildAccountUpdate('u-1', { firstName: 'Ana', lastName: '', phone: '', country: '', city: '' }, NOW).values.display_name).toBe('Ana');
  });

  it('visibility — the whole merged map with one key changed', () => {
    const req = buildVisibilityUpdate('u-1', DEFAULT_ACCOUNT_VISIBILITY, 'myPosts', 'private', NOW);
    expect(req.values.account_visibility).toEqual({ ...DEFAULT_ACCOUNT_VISIBILITY, myPosts: 'private' });
    expect(req.match).toEqual({ user_id: 'u-1' });
  });
});

describe('share URL + card param', () => {
  it('shareHash is the web djb2/base36 hash', () => {
    // Reference values computed with the web useProfileShare hashString.
    let h = 5381;
    const s = 'v2:noavatar:p-1';
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    expect(shareHash(s)).toBe(Math.abs(h).toString(36));
    expect(profileSharePath({ profileId: 'p-1', avatarUrl: undefined })).toBe(`/profiles/p-1?v=${shareHash('v2:noavatar:p-1')}`);
    expect(profileSharePath({ profileId: 'p-1', avatarUrl: 'https://cdn.example.org/a.png' })).toBe(`/profiles/p-1?v=${shareHash('v2:https://cdn.example.org/a.png')}`);
  });

  it('cardSideOf: a known side, else Identity (web getActiveCardSide)', () => {
    expect(cardSideOf('account')).toBe('account');
    expect(cardSideOf(['business'])).toBe('business');
    expect(cardSideOf('nope')).toBe('front');
    expect(cardSideOf(undefined)).toBe('front');
  });
});
