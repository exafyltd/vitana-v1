/**
 * VTID-05110 — Spotlight Phase 4 pages: each migrated social page composes its
 * Spotlight render through <ScreenFrame archetype> matching the screen
 * manifest, and the flag switches between today's render (off) and the
 * Spotlight frame (on). Phones are covered by useSpotlightEnabled itself
 * (never true below 1024 px, VTID-05105 tests).
 */
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import manifest from '@/design/screen-manifest.json';

const ROOT = path.resolve(__dirname, '../../..');
const MIGRATED: { route: string; file: string }[] = [
  { route: '/comm', file: 'src/pages/Community.tsx' },
  { route: '/comm/events-meetups', file: 'src/pages/community/EventsAndMeetups.tsx' },
  { route: '/comm/groups', file: 'src/pages/community/Groups.tsx' },
  { route: '/comm/groups/:id', file: 'src/pages/community/GroupDetail.tsx' },
  { route: '/comm/live-rooms', file: 'src/pages/community/LiveRooms.tsx' },
];

describe('VTID-05110 archetype matches the screen manifest', () => {
  it.each(MIGRATED)('$route renders ScreenFrame with its manifest archetype, behind useSpotlightEnabled', ({ route, file }) => {
    const entry = (manifest as { screens: { path: string; archetype: string }[] }).screens.find((s) => s.path === route);
    expect(entry, `manifest entry for ${route}`).toBeTruthy();
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const used = [...src.matchAll(/<ScreenFrame[\s\S]*?archetype="([a-z-]+)"/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);
    used.forEach((a) => expect(a).toBe(entry!.archetype));
    expect(src).toMatch(/useSpotlightEnabled\(\)/);
  });
});

// ── Render: Groups + GroupDetail with the flag off / on ─────────────────────
let spotlightOn = false;
vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => spotlightOn }));
vi.mock('@/lib/i18n-toast', () => {
  const t = (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k);
  return { t, lookup: t, getI18nLocale: () => 'en-US', notify: vi.fn(), notifyError: vi.fn() };
});
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string, f?: string) => f ?? k }) }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div> }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/SubNavigation', () => ({ default: () => <nav data-testid="subnav" /> }));
vi.mock('@/components/StandardHeader', () => ({
  default: (p: { title: string; density?: string }) => <header data-testid="header" data-density={p.density ?? 'default'}>{p.title}</header>,
}));
vi.mock('@/components/ui/utility-action-button', () => ({ UtilityActionButton: (p: { children?: React.ReactNode }) => <div data-testid="utility">{p.children}</div> }));
vi.mock('@/components/ui/expandable-search-button', () => ({ ExpandableSearchButton: () => <button type="button">search</button> }));
vi.mock('@/components/UniversalCalendarButton', () => ({ UniversalCalendarButton: () => <button type="button">calendar</button> }));
vi.mock('@/components/CreateGroupPopup', () => ({ CreateGroupPopup: () => null }));
vi.mock('@/components/AutopilotPopup', () => ({ AutopilotPopup: () => null }));
vi.mock('@/components/mobile/MobileActionChips', () => ({ VitanaIndexChip: () => null, AutopilotChip: () => null }));
vi.mock('@/hooks/use-autopilot', () => ({ useAutopilot: () => ({ pendingCount: 0 }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
const groups = [
  { id: 'g1', name: 'Cold Plunge Club', description: null, category: 'fitness', cover_url: null, avatar_url: null, member_count: 4, is_public: true, created_at: '' },
  { id: 'g2', name: 'Sleep Lab', description: null, category: null, cover_url: null, avatar_url: null, member_count: 9, is_public: true, created_at: '' },
];
vi.mock('@/hooks/useUserGroups', () => ({ useUserGroups: () => ({ data: groups, isLoading: false }) }));
vi.mock('@/hooks/useGroupDirectory', () => ({ useGroupDirectory: () => ({ data: [], isLoading: false }) }));
vi.mock('@/hooks/useGroupMembership', () => ({
  useGroupMembership: () => ({ isMember: true, checkingMembership: false, isJoining: false, isLeaving: false, joinGroup: vi.fn(), leaveGroup: vi.fn() }),
}));
vi.mock('@tanstack/react-query', async (orig) => ({
  ...(await orig<typeof import('@tanstack/react-query')>()),
  useQuery: ({ queryKey }: { queryKey: unknown[] }) =>
    queryKey[0] === 'group-detail'
      ? { data: { ...groups[0], description: 'Icy mornings' }, isLoading: false }
      : { data: [], isLoading: false },
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/components/community/GroupFeed', () => ({ GroupFeed: () => <div data-testid="group-feed" /> }));
vi.mock('@/components/community/GroupMembersDialog', () => ({ GroupMembersDialog: () => null }));

import Groups from './Groups';
import GroupDetail from './GroupDetail';

const at = (url: string, pattern: string, el: React.ReactElement) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path={pattern} element={el} />
      </Routes>
    </MemoryRouter>,
  );

describe('VTID-05110 flag switch on real pages', () => {
  beforeEach(() => {
    spotlightOn = false;
  });

  it('Groups: flag off → today\'s render (no ScreenFrame); on → collection frame, compact header, VCards', () => {
    const off = at('/comm/groups', '/comm/groups', <Groups />);
    expect(off.container.querySelector('[data-archetype]')).toBeNull();
    expect(off.container.querySelector('[data-vcard-size]')).toBeNull();
    expect(screen.getByTestId('header').getAttribute('data-density')).toBe('default');
    off.unmount();

    spotlightOn = true;
    const on = at('/comm/groups', '/comm/groups', <Groups />);
    expect(on.container.querySelector('[data-archetype]')!.getAttribute('data-archetype')).toBe('collection');
    expect(screen.getByTestId('header').getAttribute('data-density')).toBe('compact');
    expect(on.container.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(0);
    expect(on.container.querySelectorAll('[data-vcard-size="row"]')).toHaveLength(2);
    expect(screen.getByText('Cold Plunge Club')).toBeInTheDocument();
  });

  it('GroupDetail: flag on → detail frame with exactly one spotlight card, the feed and a rail', () => {
    const off = at('/comm/groups/g1', '/comm/groups/:id', <GroupDetail />);
    expect(off.container.querySelector('[data-archetype]')).toBeNull();
    off.unmount();

    spotlightOn = true;
    const on = at('/comm/groups/g1', '/comm/groups/:id', <GroupDetail />);
    expect(on.container.querySelector('[data-archetype]')!.getAttribute('data-archetype')).toBe('detail');
    expect(on.container.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    expect(screen.getByTestId('group-feed')).toBeInTheDocument();
    expect(on.container.querySelector('aside[data-spotlight-rail]')).not.toBeNull();
    expect(screen.getByText('spotlightSocial.groups.leave')).toBeInTheDocument();
  });
});
