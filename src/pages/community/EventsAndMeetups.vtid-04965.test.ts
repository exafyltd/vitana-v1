/**
 * VTID-04965 — the open Live Room drawer lives in the address (?event=<id>),
 * so going to the host's profile and back lands on the same room. Pinned at
 * the source level like the rest of this page (no render harness).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = readFileSync(join(__dirname, 'EventsAndMeetups.tsx'), 'utf8');

describe('Events page room drawer address (VTID-04965)', () => {
  it('tapping a scheduled room puts ?event=<id> in the address, keeping other params', () => {
    const tap = PAGE.slice(PAGE.indexOf('const handleCardClick'), PAGE.indexOf('const handleCardClick') + 1200);
    expect(tap).toContain('setRoomDrawerEvent(event);');
    expect(tap).toMatch(/new URLSearchParams\(prev\);\s*next\.set\('event', event\.id\);/);
  });

  it('closing the drawer removes ?event= and clears the deep-link guard', () => {
    const close = PAGE.slice(PAGE.indexOf('const closeRoomDrawer'), PAGE.indexOf('const closeRoomDrawer') + 500);
    expect(close).toContain('roomDeepLinkRef.current = null;');
    expect(close).toContain('setRoomDrawerEvent(null);');
    expect(close).toContain("next.delete('event');");
  });

  it('history going back from an open room (address loses ?event=) closes it', () => {
    expect(PAGE).toContain('roomUrlSyncedRef');
    expect(PAGE).toMatch(/The address had the room and lost it: history went back\./);
  });

  it('a room link in the address reopens the drawer (profile → back)', () => {
    expect(PAGE).toMatch(/A room link: open the room's own drawer, never the event drawer\./);
    expect(PAGE).toContain('setRoomDrawerEvent(event);\n      return;');
  });
});
