/**
 * VTID-04977 — "Erinnern" on a live room must not also create a personal
 * reminder: the calendar entry (DB trigger, VTID-04965) already reminds 10 min
 * before, so a second one rang twice.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILES = [
  'src/components/liverooms/LiveRoomDrawer.tsx',
  'src/components/events/EventsLiveRooms.tsx',
  'src/pages/community/LiveRooms.tsx',
];

describe('Erinnern call sites (VTID-04977)', () => {
  it.each(FILES)('%s does not create a personal reminder', (f) => {
    const src = readFileSync(resolve(process.cwd(), f), 'utf8');
    expect(src).not.toMatch(/useCreateReminder/);
    expect(src).not.toMatch(/createReminder\s*\(/);
    expect(src).toMatch(/subscribe/i);
  });
});
