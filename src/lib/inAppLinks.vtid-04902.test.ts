import { describe, it, expect } from 'vitest';
import { resolveInAppEventPath } from './inAppLinks';

// VTID-04902 — an event link tapped in a chat opens the Events screen in the
// app, not the public landing page in a browser layer over the chat.
describe('resolveInAppEventPath', () => {
  const id = '6bb46db6-a3ba-42b6-8a50-2be8658e436f';

  it('maps the canonical share link (id or slug) to the Events screen', () => {
    expect(resolveInAppEventPath(`https://vitanaland.com/events/${id}`)).toBe(`/comm/events-meetups?event=${id}`);
    expect(resolveInAppEventPath('https://vitanaland.com/events/sommerfest-2026')).toBe('/comm/events-meetups?event=sommerfest-2026');
  });

  it('accepts www., e., trailing slash, query strings and the other event paths', () => {
    expect(resolveInAppEventPath('https://www.vitanaland.com/events/abc/')).toBe('/comm/events-meetups?event=abc');
    expect(resolveInAppEventPath('https://e.vitanaland.com/e/abc?utm_source=x')).toBe('/comm/events-meetups?event=abc');
    expect(resolveInAppEventPath(`https://vitanaland.com/pub/events/${id}`)).toBe(`/comm/events-meetups?event=${id}`);
    expect(resolveInAppEventPath(`https://vitanaland.com/comm/events-meetups?tab=hot&event=${id}`)).toBe(`/comm/events-meetups?event=${id}`);
  });

  it('decodes and re-encodes slugs', () => {
    expect(resolveInAppEventPath('https://vitanaland.com/events/tanz%20abend')).toBe('/comm/events-meetups?event=tanz%20abend');
  });

  it('leaves foreign hosts and non-event links alone', () => {
    expect(resolveInAppEventPath('https://example.com/events/abc')).toBeNull();
    expect(resolveInAppEventPath('https://vitanaland.com.evil.io/events/abc')).toBeNull();
    expect(resolveInAppEventPath('https://vitanaland.com/profiles/abc')).toBeNull();
    expect(resolveInAppEventPath('https://vitanaland.com/events')).toBeNull();
    expect(resolveInAppEventPath('https://vitanaland.com/comm/events-meetups')).toBeNull();
    expect(resolveInAppEventPath('not a url')).toBeNull();
    expect(resolveInAppEventPath('javascript:alert(1)')).toBeNull();
  });
});
