/**
 * VTID-05530 — the pure calendar rules the native port re-implements from the web
 * (`vcal/time.ts`, `vcal/theme.ts`, `vcal/entry-actions.ts`, `vcal/labels.ts`) and the native
 * locale-format twin: ranges and stepping, the entry kind, who may edit / remove / invite, the
 * source action, and date/time formatting in the viewer's locale (including Arabic digits).
 */
import '../helpers/no-network';
import { addDays, nextReminderAt, relativeIn, sameDay, startOfDay, stepAnchor, toLocalInput, viewRange, weekStart } from '../../src/screens/calendar/time';
import { entryKind, isDone } from '../../src/screens/calendar/theme';
import { canEditEntry, canInviteEntry, canRemoveEntry, communityEventIdOf, entryTimeState, isEndedSourceEntry, sourceActionOf } from '../../src/screens/calendar/entry-actions';
import { makeFormatters } from '../../src/screens/calendar/format';
import { entryTitle, itemsOn } from '../../src/screens/calendar/labels';
import { CalendarApiError, topPillarGain, moveBlockReasonOf, shareFailureOf } from '../../src/screens/calendar/data/api';
import { entryRow, windowItem } from './helpers';

const D = (iso: string) => new Date(iso);

describe('view ranges', () => {
  const wed = new Date(2026, 10, 11, 15, 30); // Wed 11 Nov 2026, local
  it('day: local midnight to next local midnight', () => {
    const r = viewRange('day', wed);
    expect(r.from).toEqual(new Date(2026, 10, 11));
    expect(r.to).toEqual(new Date(2026, 10, 12));
  });
  it('week starts on Monday and spans 7 days', () => {
    const r = viewRange('week', wed);
    expect(r.from).toEqual(new Date(2026, 10, 9));
    expect(r.to).toEqual(new Date(2026, 10, 16));
    expect(weekStart(new Date(2026, 10, 8)).getDate()).toBe(2); // a Sunday belongs to the week before
  });
  it('month: the 6-week grid from the Monday on or before the 1st', () => {
    const r = viewRange('month', wed);
    expect(r.from).toEqual(new Date(2026, 9, 26));
    expect(Math.round((r.to.getTime() - r.from.getTime()) / 86_400_000)).toBe(42);
  });
  it('steps by a day, a week or a month', () => {
    expect(stepAnchor('day', wed, 1).getDate()).toBe(12);
    expect(stepAnchor('week', wed, -1).getDate()).toBe(4);
    const m = stepAnchor('month', new Date(2026, 0, 31), 1);
    expect([m.getMonth(), m.getDate()]).toEqual([1, 1]);
  });
  it('sameDay / startOfDay / addDays are local', () => {
    expect(sameDay(new Date(2026, 5, 1, 1), new Date(2026, 5, 1, 23))).toBe(true);
    expect(startOfDay(wed).getHours()).toBe(0);
    expect(addDays(new Date(2026, 11, 31), 1).getFullYear()).toBe(2027);
  });
  it('toLocalInput is the device-time datetime-local value', () => {
    expect(toLocalInput(new Date(2026, 4, 3, 7, 5))).toBe('2026-05-03T07:05');
  });
});

describe('relative wording and reminders', () => {
  const t = (key: string, p?: Record<string, string | number>) => `${key}:${JSON.stringify(p ?? {})}`;
  const now = new Date('2026-11-11T10:00:00Z');
  it('never negative, then minutes, hours, days', () => {
    expect(relativeIn('2026-11-11T09:00:00Z', now, t)).toBe('vcal.rel.now:{}');
    expect(relativeIn('2026-11-11T10:12:00Z', now, t)).toBe('vcal.rel.minutes:{"count":12}');
    expect(relativeIn('2026-11-11T13:00:00Z', now, t)).toBe('vcal.rel.hours:{"count":3}');
    expect(relativeIn('2026-11-14T10:00:00Z', now, t)).toBe('vcal.rel.days:{"count":3}');
  });
  it('next reminder: the earliest one still to come', () => {
    const start = '2026-11-11T12:00:00Z';
    const next = nextReminderAt([{ kind: 'before', minutes: 120 }, { kind: 'before', minutes: 30 }], start, now);
    expect(next?.toISOString()).toBe('2026-11-11T11:30:00.000Z');
    expect(nextReminderAt([], start, now)).toBeNull();
    expect(nextReminderAt([{ kind: 'before', minutes: 600 }], start, now)).toBeNull();
  });
});

describe('entry kind and done', () => {
  const base = entryRow();
  it('derives the kind from lab order, pillar, tag, then event type', () => {
    expect(entryKind({ ...base, source_ref_type: 'lab_order' })).toBe('lab');
    expect(entryKind({ ...base, pillar: 'sleep' })).toBe('sleep');
    expect(entryKind({ ...base, wellness_tags: ['x', 'pillar:hydration'] })).toBe('hydration');
    expect(entryKind({ ...base, event_type: 'workout' })).toBe('exercise');
    expect(entryKind({ ...base, event_type: 'autopilot' })).toBe('vitana');
    expect(entryKind({ ...base, event_type: 'deployment' })).toBe('work');
    expect(entryKind(base)).toBe('personal');
  });
  it('done is completion_status or completed_at', () => {
    expect(isDone({ completion_status: 'completed', completed_at: null })).toBe(true);
    expect(isDone({ completion_status: null, completed_at: '2026-01-01T00:00:00Z' })).toBe(true);
    expect(isDone({ completion_status: null, completed_at: null })).toBe(false);
  });
});

describe('entry actions', () => {
  const now = D('2026-11-11T12:00:00Z');
  const item = (event: object = {}, over: object = {}) => windowItem({ start_time: '2026-11-11T13:00:00Z', end_time: '2026-11-11T14:00:00Z', ...over }, { start_time: '2026-11-11T13:00:00Z', end_time: '2026-11-11T14:00:00Z', ...event }) as never;
  it('edit: own one-off manual or invite entries only', () => {
    expect(canEditEntry(item())).toBe(true);
    expect(canEditEntry(item({ source_type: 'invite' }))).toBe(true);
    expect(canEditEntry(item({ source_type: 'assistant' }))).toBe(false);
    expect(canEditEntry(item({ rrule: 'FREQ=DAILY' }))).toBe(false);
    expect(canEditEntry(item({ completion_status: 'completed' }))).toBe(false);
    expect(canEditEntry(item({ status: 'cancelled' }))).toBe(false);
    expect(canEditEntry(item({}, { occurrence_index: 1 }))).toBe(false);
    expect(canEditEntry(windowItem({}, null) as never)).toBe(false);
  });
  it('remove: manual, invite or assistant', () => {
    expect(canRemoveEntry(item({ source_type: 'assistant' }))).toBe(true);
    expect(canRemoveEntry(item({ source_type: 'health_plan' }))).toBe(false);
  });
  it('invite: only what the gateway marks invitable, upcoming and not done', () => {
    expect(canInviteEntry(item({}, { invitable: true }), now)).toBe(true);
    expect(canInviteEntry(item({}, {}), now)).toBe(false);
    expect(canInviteEntry(item({}, { invitable: true }), D('2026-11-12T00:00:00Z'))).toBe(false);
  });
  it('source action: a community event, or a live room joinable from 15 minutes before', () => {
    const ev = item({ source_ref_type: 'community_event', source_ref_id: 'e9' });
    expect(communityEventIdOf(ev)).toBe('e9');
    expect(sourceActionOf(ev, now)).toEqual({ kind: 'event', eventId: 'e9', path: '/comm/events-meetups?event=e9' });
    const room = item({ source_ref_type: 'live_room_session', metadata: { live_room_id: 'r1' } });
    expect(sourceActionOf(room, D('2026-11-11T12:30:00Z'))).toMatchObject({ kind: 'live_room', path: '/comm/live-rooms/r1/view', joinable: true });
    expect(sourceActionOf(room, D('2026-11-11T12:00:00Z'))).toMatchObject({ joinable: false });
    expect(sourceActionOf(item(), now)).toBeNull();
  });
  it('time state and ended source entries', () => {
    const room = item({ source_ref_type: 'live_room_session', metadata: { live_room_id: 'r1' } });
    expect(entryTimeState(room, now)).toBe('upcoming');
    expect(entryTimeState(room, D('2026-11-11T13:30:00Z'))).toBe('live');
    expect(entryTimeState(room, D('2026-11-11T15:00:00Z'))).toBe('ended');
    expect(isEndedSourceEntry(room, D('2026-11-11T15:00:00Z'))).toBe(true);
    expect(isEndedSourceEntry(item(), D('2026-11-11T15:00:00Z'))).toBe(false); // an own task is never "ended"
  });
});

describe('labels', () => {
  const t = (k: string) => k;
  it('subscription entries show the localised title by metadata.kind; audiobook too', () => {
    expect(entryTitle({ title: 'Premium renews', source_type: 'subscription', metadata: { kind: 'renews' } }, t)).toBe('vcal.subscription.renews');
    expect(entryTitle({ title: 'x', source_type: 'audiobook' }, t)).toBe('vcal.audiobook.title');
    expect(entryTitle({ title: 'Own', source_type: 'manual' }, t)).toBe('Own');
  });
  it('itemsOn keeps the items of one local day', () => {
    const a = windowItem({}, { id: 'a', start_time: new Date(2026, 5, 1, 9).toISOString() }) as never;
    const b = windowItem({}, { id: 'b', start_time: new Date(2026, 5, 2, 9).toISOString() }) as never;
    expect(itemsOn([a, b], new Date(2026, 5, 1))).toEqual([a]);
  });
});

describe('gateway answers', () => {
  it('the pillar that gained most', () => {
    expect(topPillarGain({ per_pillar_delta: { mental: 0.2, sleep: 0.5, hydration: -1 } })).toEqual({ pillar: 'sleep', points: 0.5 });
    expect(topPillarGain({ per_pillar_delta: { mental: 0 } })).toBeNull();
    expect(topPillarGain(null)).toBeNull();
  });
  it('move and share failure reasons come from the answer body', () => {
    expect(moveBlockReasonOf(new CalendarApiError('NOT_MOVABLE', 409, { reason: 'recurring' }))).toBe('recurring');
    expect(moveBlockReasonOf(new Error('x'))).toBeNull();
    expect(shareFailureOf(new Error('x'))).toEqual({ kind: 'error', postId: null });
  });
});

describe('locale-format twin', () => {
  const when = new Date(2026, 10, 11, 14, 5);
  it('formats the same instant per viewer locale', () => {
    const de = makeFormatters('de');
    const en = makeFormatters('en');
    expect(de.fmtDate(when, { weekday: 'long', day: 'numeric', month: 'long' })).toBe('Mittwoch, 11. November');
    expect(en.fmtDate(when, { weekday: 'long', day: 'numeric', month: 'long' })).toBe('Wednesday, November 11');
    expect(de.fmtTime(when, { hour: '2-digit', minute: '2-digit' })).toBe('14:05');
    expect(de.formatDate(when, 'LLLL yyyy')).toBe('November 2026');
    expect(de.formatDate(when, 'EEE')).toMatch(/^Mi/);
    expect(de.formatDate(when, 'd')).toBe('11');
    expect(de.formatDate(when, 'EEEEEE')).toBe('Mi');
    expect(de.fmtNumber(0.4, { maximumFractionDigits: 1 })).toBe('0,4');
  });
  it('accepts an ISO string and returns the input for an invalid date', () => {
    const en = makeFormatters('en');
    expect(en.fmtDate(when.toISOString(), { day: 'numeric' })).toBe('11');
    expect(en.fmtDate('not a date', { day: 'numeric' })).toBe('not a date');
  });
  it('Arabic renders its own digits (the day-number split of the web hero relies on it)', () => {
    const ar = makeFormatters('ar');
    expect(/[\u0660-\u0669]/.test(ar.fmtDate(when, { weekday: 'long', day: 'numeric', month: 'long' }))).toBe(true);
  });
});
