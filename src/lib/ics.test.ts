import { describe, expect, it } from 'vitest';
import { buildIcs, escapeIcsText, foldIcsLine, formatIcsDate, icsFilename } from './ics';

describe('ics builder', () => {
  it('formats dates as UTC YYYYMMDDTHHMMSSZ', () => {
    expect(formatIcsDate(new Date('2026-09-23T07:05:09.123Z'))).toBe('20260923T070509Z');
  });

  it('escapes backslash, semicolon, comma and newlines', () => {
    expect(escapeIcsText('a\\b;c,d\ne\r\nf')).toBe('a\\\\b\\;c\\,d\\ne\\nf');
  });

  it('folds lines longer than 75 octets with CRLF + space', () => {
    const line = `DESCRIPTION:${'x'.repeat(200)}`;
    const folded = foldIcsLine(line);
    const physical = folded.split('\r\n');
    expect(physical.length).toBeGreaterThan(1);
    for (const p of physical) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    for (const p of physical.slice(1)) expect(p.startsWith(' ')).toBe(true);
    expect(physical.map((p, i) => (i === 0 ? p : p.slice(1))).join('')).toBe(line);
  });

  it('never splits a multi-byte character when folding', () => {
    const line = `SUMMARY:${'ü'.repeat(80)}`;
    const physical = foldIcsLine(line).split('\r\n');
    for (const p of physical) {
      expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
      expect(p).not.toContain('�');
    }
    expect(physical.map((p, i) => (i === 0 ? p : p.slice(1))).join('')).toBe(line);
  });

  it('builds a valid VCALENDAR with CRLF line endings', () => {
    const ics = buildIcs({
      uid: 'abc-123',
      title: 'Yoga, Tee; & mehr',
      start: new Date('2026-10-01T16:00:00Z'),
      end: new Date('2026-10-01T17:00:00Z'),
      description: 'Line one\nLine two',
      location: 'Berlin, DE',
      stamp: new Date('2026-09-23T00:00:00Z'),
    });
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('VERSION:2.0');
    expect(lines).toContain('BEGIN:VEVENT');
    expect(lines).toContain('UID:abc-123@vitanaland.com');
    expect(lines).toContain('DTSTAMP:20260923T000000Z');
    expect(lines).toContain('DTSTART:20261001T160000Z');
    expect(lines).toContain('DTEND:20261001T170000Z');
    expect(lines).toContain('SUMMARY:Yoga\\, Tee\\; & mehr');
    expect(lines).toContain('DESCRIPTION:Line one\\nLine two');
    expect(lines).toContain('LOCATION:Berlin\\, DE');
    expect(lines).toContain('END:VEVENT');
    expect(lines[lines.length - 2]).toBe('END:VCALENDAR');
  });

  it('omits empty optional fields', () => {
    const ics = buildIcs({ uid: 'x@y', title: 'T', start: new Date(0), end: new Date(3600000) });
    expect(ics).not.toContain('DESCRIPTION:');
    expect(ics).not.toContain('LOCATION:');
    expect(ics).toContain('UID:x@y');
  });

  it('makes safe filenames', () => {
    expect(icsFilename('Morning Yoga: Flow!')).toBe('Morning-Yoga-Flow.ics');
    expect(icsFilename('???')).toBe('event.ics');
  });
});
