/**
 * VTID-04907 (LR-C) — Events page wiring and event counters, pinned at the
 * source level (the page and drawer have no render harness; their heavy
 * dependency trees are out of scope here).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const src = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');
const PAGE = src('pages/community/EventsAndMeetups.tsx');
const DRAWER = src('components/meetups/MeetupDetailsDrawer.tsx');
const EVENTS_HOOK = src('hooks/useCommunityEvents.ts');
const CAROUSEL = src('components/community/MobileEventCarousel.tsx');

describe('Events page (VTID-04907)', () => {
  it('the drawer opens on the Following tab (currentEvents includes it)', () => {
    expect(PAGE).toMatch(/activeTab === "following" \? followedEvents/);
  });

  it('"+" → Live Room opens the Go Live popup', () => {
    expect(PAGE).toMatch(/onSelectLiveRoom=\{\(\) => \{\s*setCreateSelectionOpen\(false\);\s*setGoLiveOpen\(true\);/);
    expect(PAGE).toContain('<GoLivePopup open={goLiveOpen} onOpenChange={setGoLiveOpen} />');
  });

  it('live rooms are normal event cards in the same list — no separate strip', () => {
    expect(PAGE).not.toContain('<EventsLiveRooms');
    expect(PAGE).toContain('const liveRoomEvents = useLiveRoomEvents();');
    expect(PAGE).toMatch(/\[\.\.\.linkedEvents, \.\.\.liveRoomEvents\]/);
    expect(PAGE).toContain('isLiveRoomEvent(event) ? { ...card, ...liveRoomCardOverrides(event) } : card');
    expect(CAROUSEL).toContain('isLiveRoomEvent(event) ? { ...card, ...liveRoomCardOverrides(event) } : card');
  });

  it('Upcoming starts now (later today included), and live/due rooms are on Today and Upcoming', () => {
    expect(PAGE).toContain('return new Date(event.start_time) >= now;');
    expect(PAGE.match(/if \(isOngoingLiveRoom\(event\)\) return true;/g)).toHaveLength(2);
  });

  it('a room card opens the room or its drawer, never the event drawer', () => {
    expect(PAGE).toMatch(/if \(isLiveRoomEvent\(event\)\) \{\s*\/\/[^\n]*\n\s*if \(event\.metadata\?\.is_live\) openLiveRoom\(event\);\s*else setRoomDrawerEvent\(event\);\s*return;/);
    expect(PAGE).toContain('<LiveRoomEventDrawer event={roomDrawerEvent}');
    expect(PAGE).toContain('currentEvents.find(e => e.id === selectedEventId && !isLiveRoomEvent(e))');
  });
});

describe('event counters (VTID-04907)', () => {
  it('a realtime UPDATE keeps the computed participant_count', () => {
    const idx = EVENTS_HOOK.indexOf("event: 'UPDATE'");
    expect(idx).toBeGreaterThan(-1);
    expect(EVENTS_HOOK.slice(idx, idx + 1200)).toContain('participant_count: event.participant_count');
  });

  it('the drawer joins with an upsert and never writes participant_count', () => {
    expect(DRAWER).toMatch(/\.from\('global_event_participants'\)\s*\.upsert\(/);
    expect(DRAWER).toContain("{ onConflict: 'event_id,user_id' }");
    expect(DRAWER).not.toMatch(/\.update\(\{ participant_count/);
    expect(DRAWER).not.toContain('syncEventParticipantCount(');
  });

  it('the drawer shows no invented attendees or capacity', () => {
    expect(DRAWER).not.toContain('followersGoing');
    expect(DRAWER).not.toContain('name: `User ${i + 1}`');
    expect(DRAWER).not.toContain('event.max_participants || 30');
    expect(DRAWER).toContain("translate('eventDrawer.attendingCount'");
  });

  it('the save toast is translated', () => {
    expect(DRAWER).not.toContain('"Removed from saved"');
    expect(DRAWER).toContain("notify('toasts.meetups.savedTitle', 'toasts.meetups.savedDesc')");
  });
});
