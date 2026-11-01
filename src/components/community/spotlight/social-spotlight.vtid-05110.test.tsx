/**
 * VTID-05110 — Spotlight Phase 4 (social screens): the new VCard adapters
 * (event, live room, group, member), the full-row grid (SR-13: no empty bento
 * slots), and the presentational bodies of Community overview, Events &
 * Meetups, Groups, Group detail and Live Rooms — exactly one `spotlight` card
 * where the archetype needs one, rails with only compact / row cards (SR-08),
 * loading / empty states (SR-20, SR-25), and handlers wired (SR-26).
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/i18n-toast', () => {
  const t = (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k);
  return { t, lookup: t, getI18nLocale: () => 'en-US', notify: vi.fn(), notifyError: vi.fn() };
});
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
vi.mock('@/components/events/EventsLiveRooms', () => ({
  isLiveRoomEvent: (e: { event_type?: string | null } | null | undefined) => e?.event_type === 'live_room',
  isOngoingLiveRoom: (e: { event_type?: string; metadata?: { is_live?: boolean } }) => e.event_type === 'live_room' && e.metadata?.is_live === true,
}));
const membership = { isMember: false, checkingMembership: false, isJoining: false, isLeaving: false, joinGroup: vi.fn(), leaveGroup: vi.fn() };
vi.mock('@/hooks/useGroupMembership', () => ({ useGroupMembership: () => membership }));
// VTID-05417 — Join on the Events Spotlight card reuses the existing RSVP hook (the one NewsCard uses).
const participation = { isParticipating: false, participantCount: 48, loading: false, checking: false, toggleParticipation: vi.fn() };
const participationCalls: unknown[][] = [];
vi.mock('@/hooks/useEventParticipation', () => ({
  useEventParticipation: (...args: unknown[]) => {
    participationCalls.push(args);
    return participation;
  },
}));

import { eventToVCard, groupToVCard, liveRoomToVCard, memberToVCard } from '@/components/ui/vcard/adapters';
import type { CommunityEvent } from '@/hooks/useCommunityEvents';
import type { LiveRoom } from '@/components/liverooms/LiveRoomCard';
import { pickRailRooms, splitFullRows } from './listHelpers';
import { FullRowGrid } from './FullRowGrid';
import { EventsSpotlightBody } from './EventsSpotlightBody';
import { CommunitySpotlightBody } from './CommunitySpotlightBody';
import { GroupsSpotlightBody } from './GroupsSpotlightBody';
import { GroupDetailRail, GroupDetailStage } from './GroupDetailSpotlight';
import { LiveRoomsRail, LiveRoomsStage } from './LiveRoomsSpotlight';

const inRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);
const sizes = (root: ParentNode, size: string) => root.querySelectorAll(`[data-vcard-size="${size}"]:not([data-vcard-skeleton])`);

const ev = (over: Partial<CommunityEvent> = {}): CommunityEvent => ({
  id: 'e1', title: 'Longevity Brunch', description: 'Breathwork and brunch', event_type: 'meetup', location: 'Dorćol Platz',
  virtual_link: null, start_time: '2026-10-18T08:30:00Z', end_time: null, max_participants: null, participant_count: 48,
  created_by: 'u1', created_at: '', updated_at: '2026-10-01T00:00:00Z', image_url: 'https://cdn.example/brunch.jpg',
  ...over,
});
const room = (over: Partial<LiveRoom> = {}): LiveRoom => ({
  id: 'r1', title: 'Breathwork with Ana', host: { id: 'h1', name: 'Ana' }, isLive: true, participants: 86, tags: [], type: 'audio',
  ...over,
});

describe('VTID-05110 social VCard adapters', () => {
  it('event: date eyebrow, time · location meta, description body, deep link into the Events drawer', () => {
    const d = eventToVCard(ev());
    expect(d.title).toBe('Longevity Brunch');
    expect(d.eyebrow).toBeTruthy();
    expect(d.meta).toContain('Dorćol Platz');
    expect(d.meta).toContain(' · ');
    expect(d.body).toBe('Breathwork and brunch');
    expect(d.href).toBe('/comm/events-meetups?event=e1');
    expect(d.media?.src).toContain('brunch.jpg');
  });

  it('event without location or description never invents them', () => {
    const d = eventToVCard(ev({ location: null, description: null }));
    expect(d.body).toBeUndefined();
    expect(d.meta).not.toContain(' · ');
  });

  it('live room: live → real listener count; scheduled → its start; no cover → placeholder', () => {
    expect(liveRoomToVCard(room()).meta).toBe('spotlightSocial.liveRooms.listening:86');
    const scheduled = liveRoomToVCard(room({ isLive: false, scheduledTime: '2026-10-21T17:00:00Z' }));
    expect(scheduled.meta).toContain(' · ');
    expect(scheduled.media).toEqual({ src: null, alt: '' });
    expect(liveRoomToVCard(room({ isLive: false })).meta).toBeUndefined();
    expect(liveRoomToVCard(room()).eyebrow).toBe('Ana');
  });

  it('group: member count meta, category eyebrow, cover fallback, detail route', () => {
    const d = groupToVCard({ id: 'g1', name: 'Cold Plunge Club', category: 'fitness', member_count: 12, cover_url: null, description: '' });
    expect(d).toMatchObject({ title: 'Cold Plunge Club', eyebrow: 'fitness', href: '/comm/groups/g1' });
    expect(d.meta).toBe('spotlightSocial.common.membersCount:12');
    expect(d.media?.src).toBeTruthy();
    expect(d.body).toBeUndefined();
  });

  it('member: handle wins in the profile link; no name → catalog label, never "Unknown User"', () => {
    expect(memberToVCard({ user_id: 'u1', display_name: 'Mila', handle: 'mila' })).toMatchObject({ title: 'Mila', meta: '@mila', href: '/u/mila' });
    const anon = memberToVCard({ user_id: 'u2', display_name: null, avatar_url: null });
    expect(anon.title).toBe('spotlightSocial.common.member');
    expect(anon.href).toBe('/u/u2');
    expect(anon.media).toEqual({ src: null, alt: 'spotlightSocial.common.member' });
  });
});

describe('VTID-05110 full rows only (SR-13)', () => {
  it('splitFullRows keeps complete rows in the grid and the remainder as a list — nothing dropped', () => {
    expect(splitFullRows([1, 2, 3, 4, 5], 3)).toEqual({ grid: [1, 2, 3], rest: [4, 5] });
    expect(splitFullRows([1, 2], 3)).toEqual({ grid: [], rest: [1, 2] });
    expect(splitFullRows([1, 2, 3, 4], 2)).toEqual({ grid: [1, 2, 3, 4], rest: [] });
  });

  it('FullRowGrid renders standard cards in complete rows and the leftover as row cards', () => {
    const items = ['a', 'b', 'c', 'd'];
    const { container } = render(
      <FullRowGrid items={items} cols={3} renderItem={(i, size) => <div key={i} data-vcard-size={size}>{i}</div>} />,
    );
    expect(sizes(container, 'standard')).toHaveLength(3);
    expect(sizes(container, 'row')).toHaveLength(1);
    expect(container.querySelector('.grid-cols-3')!.children).toHaveLength(3);
  });

  it('pickRailRooms never repeats the stage room and caps both lists', () => {
    const live = Array.from({ length: 6 }, (_, i) => ({ id: `l${i}` }));
    const next = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}` }));
    const r = pickRailRooms(live, next, 'l0');
    expect(r.liveItems.map((x) => x.id)).toEqual(['l1', 'l2', 'l3', 'l4']);
    expect(r.nextItems).toHaveLength(5);
  });
});

describe('VTID-05110 / VTID-05417 Events & Meetups body (Spotlight grid, SR-31)', () => {
  const empty = { titleKey: 'spotlightSocial.events.emptyTitle', descriptionKey: 'spotlightSocial.events.emptyDesc' };
  const nine = () => [
    ev(),
    ...Array.from({ length: 8 }, (_, i) => ev({ id: `e${i + 2}`, title: `Event ${i + 2}` })),
  ];
  const slot = (root: ParentNode, name: string) => root.querySelector(`[data-spotlight-grid] [data-slot="${name}"]`) as HTMLElement | null;
  const reset = () => {
    participation.isParticipating = false;
    participation.checking = false;
    participation.loading = false;
    participation.toggleParticipation.mockClear();
    participationCalls.length = 0;
  };

  it('the next event is the one labelled spotlight card; this week\'s next six are standard tiles beside it; the rest are the compact Upcoming row', () => {
    reset();
    const { container } = inRouter(<EventsSpotlightBody events={nine()} loading={false} liveNow={[]} onOpen={vi.fn()} empty={empty} />);
    expect(container.querySelectorAll('[data-spotlight-grid]')).toHaveLength(1);
    const spot = slot(container, 'spotlight')!;
    expect(sizes(container, 'spotlight')).toHaveLength(1);
    expect(sizes(spot, 'spotlight')).toHaveLength(1);
    expect(within(spot).getByText('Longevity Brunch')).toBeInTheDocument();
    expect(spot.querySelector('[data-vcard-spotlight-label]')).not.toBeNull();
    const tiles = slot(container, 'tiles')!;
    expect(sizes(tiles, 'standard')).toHaveLength(6);
    expect(within(tiles).getByText('Event 2')).toBeInTheDocument();
    expect(within(tiles).getByText('Event 7')).toBeInTheDocument();
    const row = slot(container, 'row')!;
    expect(sizes(row, 'compact')).toHaveLength(2);
    expect(within(row).getByText('spotlight.grid.events.upcoming')).toBeInTheDocument();
    expect(within(row).getByText('Event 9')).toBeInTheDocument();
    expect(screen.getByText('spotlight.grid.events.thisWeek')).toBeInTheDocument();
    // No `row`-size list and no nested stage-rail any more (D8).
    expect(sizes(container, 'row')).toHaveLength(0);
    expect(container.querySelector('aside[data-spotlight-rail]')).toBeNull();
  });

  it('tile, row and Details clicks open the page handler; Join on a free event uses the existing RSVP toggle', () => {
    reset();
    const onOpen = vi.fn();
    const events = nine();
    inRouter(<EventsSpotlightBody events={events} loading={false} liveNow={[]} onOpen={onOpen} empty={empty} />);
    fireEvent.click(screen.getByText('Event 3'));
    expect(onOpen).toHaveBeenCalledWith(events[2]);
    fireEvent.click(screen.getByText('Event 9'));
    expect(onOpen).toHaveBeenCalledWith(events[8]);
    fireEvent.click(screen.getByRole('button', { name: 'spotlightSocial.common.details' }));
    expect(onOpen).toHaveBeenCalledWith(events[0]);
    expect(screen.getByText('spotlightSocial.events.going:48')).toBeInTheDocument();
    expect(participationCalls[0]).toEqual(['e1', 48]);
    onOpen.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'spotlight.grid.events.join' }));
    expect(participation.toggleParticipation).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('Join on a paid / ticketed event or a live room opens it (drawer / room) and never writes; already going → no Join', () => {
    reset();
    const onOpen = vi.fn();
    const paid = ev({ metadata: { is_paid: true } });
    const view = inRouter(<EventsSpotlightBody events={[paid]} loading={false} liveNow={[]} onOpen={onOpen} empty={empty} />);
    fireEvent.click(screen.getByRole('button', { name: 'spotlight.grid.events.join' }));
    expect(onOpen).toHaveBeenCalledWith(paid);
    view.unmount();
    const liveRoom = ev({ id: 'lr0', event_type: 'live_room', metadata: { is_live: true } });
    const view2 = inRouter(<EventsSpotlightBody events={[liveRoom]} loading={false} liveNow={[]} onOpen={onOpen} empty={empty} />);
    fireEvent.click(screen.getByRole('button', { name: 'spotlight.grid.events.join' }));
    expect(onOpen).toHaveBeenCalledWith(liveRoom);
    expect(participation.toggleParticipation).not.toHaveBeenCalled();
    expect(participationCalls).toHaveLength(0);
    view2.unmount();
    participation.isParticipating = true;
    inRouter(<EventsSpotlightBody events={[ev()]} loading={false} liveNow={[]} onOpen={onOpen} empty={empty} />);
    expect(screen.queryByRole('button', { name: 'spotlight.grid.events.join' })).toBeNull();
    expect(screen.getByRole('button', { name: 'spotlightSocial.common.details' })).toBeInTheDocument();
  });

  it('Live now and You follow move below the grid as compact rows — never spotlight or standard, no rail (D8)', () => {
    reset();
    const onOpen = vi.fn();
    const live = [ev({ id: 'lr1', title: 'Live breathwork', event_type: 'live_room', metadata: { is_live: true } })];
    const { container } = inRouter(
      <EventsSpotlightBody
        events={[ev()]}
        loading={false}
        liveNow={live}
        followed={[{ user_id: 'u9', display_name: 'Mila', handle: 'mila' }]}
        onOpen={onOpen}
        empty={empty}
      />,
    );
    expect(container.querySelector('aside[data-spotlight-rail]')).toBeNull();
    const below = container.querySelector('[data-spotlight-section="events-around"]')!;
    expect(below).not.toBeNull();
    expect(container.querySelector('[data-spotlight-grid]')!.contains(below)).toBe(false);
    expect(sizes(below.querySelector('[data-rail-block="live"]')!, 'compact')).toHaveLength(1);
    expect(sizes(below.querySelector('[data-rail-block="following"]')!, 'compact')).toHaveLength(1);
    expect(sizes(below, 'spotlight')).toHaveLength(0);
    expect(sizes(below, 'standard')).toHaveLength(0);
    fireEvent.click(screen.getByText('Live breathwork'));
    expect(onOpen).toHaveBeenCalledWith(live[0]);
    expect(screen.getByText('Mila').closest('a')!.getAttribute('href')).toBe('/u/mila');
  });

  it('fewer than seven events: only real tiles (D4), no Upcoming row; one event → no tiles, no empty filler', () => {
    reset();
    const three = [ev(), ev({ id: 'e2', title: 'Cold-plunge club' }), ev({ id: 'e3', title: 'Sleep science talk' })];
    const { container, rerender } = inRouter(<EventsSpotlightBody events={three} loading={false} liveNow={[]} onOpen={vi.fn()} empty={empty} />);
    expect(sizes(container, 'spotlight')).toHaveLength(1);
    expect(sizes(slot(container, 'tiles')!, 'standard')).toHaveLength(2);
    expect(slot(container, 'row')).toBeNull();
    expect(container.querySelector('[data-spotlight-section="events-around"]')).toBeNull();
    rerender(<MemoryRouter><EventsSpotlightBody events={[ev()]} loading={false} liveNow={[]} onOpen={vi.fn()} empty={empty} /></MemoryRouter>);
    expect(sizes(container, 'spotlight')).toHaveLength(1);
    expect(sizes(slot(container, 'tiles')!, 'standard')).toHaveLength(0);
    expect(container.querySelector('[data-social-empty]')).toBeNull();
  });

  it('loading shows the grid skeleton, an empty tab shows the shared empty state with its action (no grid, no rail)', () => {
    reset();
    const { container, rerender } = inRouter(<EventsSpotlightBody events={[]} loading liveNow={[]} onOpen={vi.fn()} empty={empty} />);
    expect(container.querySelector('[data-archetype-skeleton][data-skeleton-layout="spotlight-grid"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-vcard-skeleton]').length).toBe(12);
    const onAction = vi.fn();
    rerender(
      <MemoryRouter>
        <EventsSpotlightBody events={[]} loading={false} liveNow={[]} onOpen={vi.fn()} empty={{ ...empty, actionKey: 'spotlightSocial.events.create', onAction }} />
      </MemoryRouter>,
    );
    expect(screen.getByText('spotlightSocial.events.emptyTitle')).toBeInTheDocument();
    fireEvent.click(screen.getByText('spotlightSocial.events.create'));
    expect(onAction).toHaveBeenCalled();
    expect(container.querySelector('[data-spotlight-grid]')).toBeNull();
    expect(container.querySelector('aside[data-spotlight-rail]')).toBeNull();
  });
});

describe('VTID-05110 Community overview body', () => {
  const base = {
    live: [], today: [], week: [], eventsLoading: false, groups: [], groupsLoading: false,
    onBrowseEvents: vi.fn(), onCreateGroup: vi.fn(),
  };

  it('collection: no spotlight card; sections render real items in full rows and link to their screens', () => {
    const today = [ev(), ev({ id: 'e2', title: 'B' }), ev({ id: 'e3', title: 'C' }), ev({ id: 'e4', title: 'D' })];
    const { container } = inRouter(
      <CommunitySpotlightBody
        {...base}
        live={[room()]}
        today={today}
        groups={[{ id: 'g1', name: 'Cold Plunge Club', member_count: 3 }]}
      />,
    );
    expect(sizes(container, 'spotlight')).toHaveLength(0);
    const todaySection = container.querySelector('[data-spotlight-section="community-today"]')!;
    expect(sizes(todaySection, 'standard')).toHaveLength(3);
    expect(sizes(todaySection, 'row')).toHaveLength(1);
    expect(screen.getByText('Longevity Brunch').closest('a')!.getAttribute('href')).toBe('/comm/events-meetups?event=e1');
    expect(screen.getByText('Cold Plunge Club').closest('a')!.getAttribute('href')).toBe('/comm/groups/g1');
    expect(screen.getByText('Breathwork with Ana').closest('a')!.getAttribute('href')).toBe('/comm/live-rooms?live=r1');
  });

  it('no live rooms → no live section; empty sections show shared empty states with working actions', () => {
    const onBrowseEvents = vi.fn();
    const onCreateGroup = vi.fn();
    const { container } = inRouter(<CommunitySpotlightBody {...base} onBrowseEvents={onBrowseEvents} onCreateGroup={onCreateGroup} />);
    expect(container.querySelector('[data-spotlight-section="community-live"]')).toBeNull();
    expect(container.querySelectorAll('[data-social-empty]')).toHaveLength(3);
    fireEvent.click(screen.getAllByText('spotlightSocial.community.openEvents')[0]);
    expect(onBrowseEvents).toHaveBeenCalled();
    fireEvent.click(screen.getByText('spotlightSocial.groups.createAction'));
    expect(onCreateGroup).toHaveBeenCalled();
  });

  it('a failed groups query shows the error state with retry', () => {
    const onRetryGroups = vi.fn();
    inRouter(<CommunitySpotlightBody {...base} groupsError onRetryGroups={onRetryGroups} />);
    fireEvent.click(screen.getByText('spotlightSocial.common.retry'));
    expect(onRetryGroups).toHaveBeenCalled();
  });
});

describe('VTID-05110 Groups body', () => {
  const groups = Array.from({ length: 5 }, (_, i) => ({ id: `g${i}`, name: `Group ${i}`, member_count: i }));
  const empty = { titleKey: 'spotlightSocial.groups.emptyMineTitle' };

  it('standard grid of full rows + row remainder; Join only on Discover', () => {
    const { container, rerender } = inRouter(<GroupsSpotlightBody groups={groups} loading={false} empty={empty} />);
    expect(sizes(container, 'standard')).toHaveLength(3);
    expect(sizes(container, 'row')).toHaveLength(2);
    expect(screen.queryByText('spotlightSocial.groups.join')).toBeNull();
    rerender(<MemoryRouter><GroupsSpotlightBody groups={groups.slice(0, 3)} loading={false} withJoin empty={empty} /></MemoryRouter>);
    const joins = screen.getAllByText('spotlightSocial.groups.join');
    expect(joins).toHaveLength(3);
    fireEvent.click(joins[0]);
    expect(membership.joinGroup).toHaveBeenCalled();
  });

  it('loading → standard skeletons; nothing → empty state', () => {
    const { container, rerender } = inRouter(<GroupsSpotlightBody groups={[]} loading empty={empty} />);
    expect(container.querySelectorAll('[data-vcard-skeleton]').length).toBe(6);
    rerender(<MemoryRouter><GroupsSpotlightBody groups={[]} loading={false} empty={empty} /></MemoryRouter>);
    expect(screen.getByText('spotlightSocial.groups.emptyMineTitle')).toBeInTheDocument();
  });
});

describe('VTID-05110 Group detail', () => {
  it('the group is the one spotlight card with Join; the feed follows; the rail opens the members list', () => {
    const join = vi.fn();
    const onShowMembers = vi.fn();
    const { container } = inRouter(
      <>
        <GroupDetailStage
          group={{ id: 'g1', name: 'Cold Plunge Club', description: 'Icy mornings', member_count: 12, is_public: true }}
          membership={{ isMember: false, checking: false, isJoining: false, isLeaving: false, join, leave: vi.fn() }}
          feed={<div data-testid="feed" />}
        />
        <GroupDetailRail memberCount={12} onShowMembers={onShowMembers} />
      </>,
    );
    expect(sizes(container, 'spotlight')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Cold Plunge Club' })).toBeInTheDocument();
    expect(screen.getByTestId('feed')).toBeInTheDocument();
    fireEvent.click(screen.getByText('spotlightSocial.groups.join'));
    expect(join).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'spotlightSocial.groupDetail.showMembers' }));
    expect(onShowMembers).toHaveBeenCalled();
    expect(screen.getByText('spotlightSocial.groupDetail.browse').closest('a')!.getAttribute('href')).toBe('/comm/groups');
  });
});

describe('VTID-05110 Live Rooms', () => {
  const actions = () => ({ onOpen: vi.fn(), onJoin: vi.fn(), onNotify: vi.fn(), canEnter: (r: LiveRoom) => r.isLive, notifying: new Set<string>() });
  const empty = { titleKey: 'spotlightSocial.liveRooms.emptyTitle' };

  it('first room is the one spotlight card with Join; the others are a full-row grid; cards open the drawer', () => {
    const a = actions();
    const rooms = [room(), room({ id: 'r2', title: 'Sleep talk', isLive: false }), room({ id: 'r3', title: 'Yoga', isLive: false }), room({ id: 'r4', title: 'Qi', isLive: false })];
    const { container } = inRouter(<LiveRoomsStage rooms={rooms} loading={false} empty={empty} actions={a} />);
    expect(sizes(container, 'spotlight')).toHaveLength(1);
    expect(sizes(container, 'standard')).toHaveLength(2);
    expect(sizes(container, 'row')).toHaveLength(1);
    fireEvent.click(screen.getByText('spotlightSocial.liveRooms.join'));
    expect(a.onJoin).toHaveBeenCalledWith('r1');
    fireEvent.click(screen.getByText('Sleep talk'));
    expect(a.onOpen).toHaveBeenCalledWith('r2');
  });

  it('a scheduled hero offers Remind me (pressed state from real subscriptions)', () => {
    const a = { ...actions(), notifying: new Set(['r2']) };
    inRouter(<LiveRoomsStage rooms={[room({ id: 'r2', isLive: false })]} loading={false} empty={empty} actions={a} />);
    const btn = screen.getByText('spotlightSocial.liveRooms.notifyOn');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(btn);
    expect(a.onNotify).toHaveBeenCalledWith('r2');
  });

  it('empty → a text-only spotlight card (focus-feed keeps one dominant card, SR-06) with Go live; rail holds only compact cards', () => {
    const onAction = vi.fn();
    const empty1 = inRouter(<LiveRoomsStage rooms={[]} loading={false} empty={{ ...empty, actionKey: 'spotlightSocial.liveRooms.goLive', onAction }} actions={actions()} />);
    expect(sizes(empty1.container, 'spotlight')).toHaveLength(1);
    expect(empty1.container.querySelector('[data-vcard-media]')).toBeNull();
    expect(screen.getByText('spotlightSocial.liveRooms.emptyTitle')).toBeInTheDocument();
    fireEvent.click(screen.getByText('spotlightSocial.liveRooms.goLive'));
    expect(onAction).toHaveBeenCalled();
    const onOpen = vi.fn();
    const { container } = inRouter(<LiveRoomsRail liveItems={[room()]} nextItems={[room({ id: 'r5', title: 'Later', isLive: false })]} onOpen={onOpen} />);
    expect(sizes(container, 'compact')).toHaveLength(2);
    fireEvent.click(screen.getByText('Later'));
    expect(onOpen).toHaveBeenCalledWith('r5');
  });
});
