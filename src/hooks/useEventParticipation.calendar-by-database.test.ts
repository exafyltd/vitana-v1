/**
 * VTID-04915 — joining or leaving a community event no longer writes the
 * calendar from the app. The database does it on every path (web, voice,
 * tickets): trg_event_participation_calendar (VTID-04321) adds the entry on
 * join and cancels it on leave. The old client-side add/remove (and the
 * error logging around its cleanup lookup, VTID-04321-era tests) is gone,
 * so a join never writes two rows and a leave never misses one.
 *
 * Pinned at the source level, like the tests this replaces.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const hook = readFileSync(join(__dirname, 'useEventParticipation.ts'), 'utf8');
const drawer = readFileSync(join(__dirname, '../components/meetups/MeetupDetailsDrawer.tsx'), 'utf8');

describe('community event join/leave leaves the calendar to the database (VTID-04915)', () => {
  it('the participation hook never reads or writes calendar_events', () => {
    expect(hook).not.toContain("from('calendar_events')");
    expect(hook).not.toContain('useCalendarEvents');
    expect(hook).not.toMatch(/\baddEvent\(|\bremoveEvent\(/);
    expect(hook).toContain("from('global_event_participants')");
  });

  it('the event drawer join, undo and leave paths no longer touch calendar_events', () => {
    expect(drawer).not.toContain(".from('calendar_events')");
    expect(drawer).not.toMatch(/\bremoveEvent\(/);
    // The only remaining client write is the explicit "Add to VITANA Calendar"
    // for someone who has not joined; it is disabled once joined.
    expect(drawer.match(/\baddEvent\(/g)?.length).toBe(1);
    expect(drawer).toContain('onSelect={handleAddToVitanaCalendar} disabled={isJoined}');
  });
});
