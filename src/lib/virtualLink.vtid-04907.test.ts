/**
 * VTID-04907 (LR-C) — only a real http(s) URL is stored or rendered as a
 * virtual event's join link; create/edit never write the 'Virtual Event'
 * literal again, and the drawer links only http(s) URLs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { isHttpUrl, toVirtualLink } from './virtualLink';

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');

describe('virtual links', () => {
  it('accepts http(s) URLs only', () => {
    expect(isHttpUrl('https://meet.example.com/abc')).toBe(true);
    expect(isHttpUrl(' http://zoom.us/j/1 ')).toBe(true);
    expect(isHttpUrl('Virtual Event')).toBe(false);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('ftp://x')).toBe(false);
    expect(isHttpUrl(null)).toBe(false);
  });

  it('stores a link only for a virtual event with a valid URL', () => {
    expect(toVirtualLink(true, ' https://meet.example.com/x ')).toBe('https://meet.example.com/x');
    expect(toVirtualLink(true, '')).toBeUndefined();
    expect(toVirtualLink(true, 'Virtual Event')).toBeUndefined();
    expect(toVirtualLink(false, 'https://meet.example.com/x')).toBeUndefined();
  });

  it.each(['components/CreateEventPopup.tsx', 'components/CreateMeetupPopup.tsx', 'components/EditMeetupPopup.tsx'])(
    '%s never writes the literal',
    (file) => {
      const src = read(file);
      expect(src).not.toContain("'Virtual Event'");
      expect(src).toContain('toVirtualLink(formData.isVirtual, formData.virtualLink)');
    },
  );

  it('the drawer renders the join link only for an http(s) URL', () => {
    const src = read('components/meetups/MeetupDetailsDrawer.tsx');
    expect(src).toContain('const joinLink = isHttpUrl(event.virtual_link)');
    expect(src).toContain('href={joinLink}');
    expect(src).not.toContain('href={event.virtual_link}');
  });
});
