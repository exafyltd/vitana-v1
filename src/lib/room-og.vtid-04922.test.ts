/**
 * VTID-04922 — the Live Room Open Graph preview builder (supabase/functions/og-event/room-og.ts)
 * and the room share link.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  buildRoomOgHtml,
  isPublicRoomStatus,
  isUuid,
  pickRoomImage,
  roomImageUrl,
  roomUrls,
  OG_DEFAULT_IMAGE,
} from '../../supabase/functions/og-event/room-og';
import { getLiveRoomShareUrl } from './shareUrl';

const ID = '9c55506a-0b41-4f08-bce8-c63ba3f4edbf';
const SUPA = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public';

describe('getLiveRoomShareUrl', () => {
  it('uses the worker-bound /events/<id> path on the apex domain', () => {
    expect(getLiveRoomShareUrl(ID)).toBe(`https://vitanaland.com/events/${ID}`);
  });
});

describe('room OG helpers', () => {
  it('only treats real UUIDs as room ids (junk and slugs never trigger the lookup)', () => {
    expect(isUuid(ID)).toBe(true);
    expect(isUuid('summer-wellness-retreat')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid(null)).toBe(false);
  });

  it('mirrors the community_live_streams public read policy', () => {
    expect(isPublicRoomStatus('pending', false)).toBe(true);
    expect(isPublicRoomStatus('live', null)).toBe(true);
    expect(isPublicRoomStatus('ended', true)).toBe(true);
    expect(isPublicRoomStatus('ended', false)).toBe(false);
    expect(isPublicRoomStatus('cancelled', true)).toBe(false);
  });

  it('resizes Supabase images to 1200x630, quality 80, original format (WhatsApp-safe)', () => {
    const out = roomImageUrl(`${SUPA}/avatars/u/photo.png?x=1`)!;
    expect(out).toContain('/storage/v1/render/image/public/avatars/u/photo.png');
    expect(out).toContain('width=1200');
    expect(out).toContain('height=630');
    expect(out).toContain('quality=80');
    expect(out).toContain('format=origin');
    expect(out).not.toContain('x=1');
  });

  it('keeps an external https image as is and rejects non-http values', () => {
    expect(roomImageUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(roomImageUrl('javascript:alert(1)')).toBeNull();
    expect(roomImageUrl('/relative.jpg')).toBeNull();
  });

  it('picks cover first, then the host avatar, then the branded default', () => {
    expect(pickRoomImage(`${SUPA}/covers/c.jpg`, `${SUPA}/avatars/a.jpg`)).toContain('covers/c.jpg');
    expect(pickRoomImage(null, `${SUPA}/avatars/a.jpg`)).toContain('avatars/a.jpg');
    expect(pickRoomImage(null, null)).toBe(OG_DEFAULT_IMAGE);
  });

  it('canonical is the /events/<id> link; humans go to ?share=room', () => {
    const u = roomUrls(ID);
    expect(u.canonicalUrl).toBe(`https://vitanaland.com/events/${ID}`);
    expect(u.destinationUrl).toBe(`https://vitanaland.com/?share=room&id=${ID}`);
  });
});

describe('buildRoomOgHtml', () => {
  const html = buildRoomOgHtml({
    id: ID,
    title: 'Mariia’s Live Room is back 😍 <b>&"x"',
    description: 'Wir sehen uns morgen\nFREUE MICH AUF EUCH',
    cover_image_url: null,
    host_avatar_url: `${SUPA}/avatars/mariia.jpg`,
  });

  it('carries the room title, blurb, host image and canonical url', () => {
    expect(html).toContain('<meta property="og:title" content="Mariia\'s Live Room is back 😍 &amp;&quot;x&quot;" />');
    expect(html).toContain('content="Wir sehen uns morgen FREUE MICH AUF EUCH"');
    expect(html).toContain('avatars/mariia.jpg');
    expect(html).toContain(`<meta property="og:url" content="https://vitanaland.com/events/${ID}" />`);
    expect(html).toContain('summary_large_image');
  });

  it('escapes markup so a title cannot break out of the attribute', () => {
    expect(html).not.toContain('<b>');
    expect(html).not.toMatch(/content="[^"]*"[^>]*"x"/);
  });

  it('falls back to neutral text and the default image when the room has none', () => {
    const bare = buildRoomOgHtml({ id: ID, title: null, description: null, cover_image_url: null, host_avatar_url: null });
    expect(bare).toContain('MAXINA Live Room');
    expect(bare).toContain('Join this live room on MAXINA');
    expect(bare).toContain(OG_DEFAULT_IMAGE);
  });
});

describe('og-event wiring (source level — the Deno function has no render harness)', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'supabase/functions/og-event/index.ts'), 'utf8');

  it('consults community_live_streams only when no event matched and the id is a UUID', () => {
    expect(src).toContain("if (!event && eventId && isUuid(eventId))");
    expect(src).toContain(".from('community_live_streams')");
    // never from the slug-only path
    expect(src.indexOf(".from('community_live_streams')")).toBeGreaterThan(src.indexOf("from('global_community_events')"));
  });
});

describe('no old-style room share link remains', () => {
  const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');
  const SITES = [
    'src/pages/community/LiveRooms.tsx',
    'src/components/community/MobileLiveRoomCarousel.tsx',
    'src/components/events/EventsLiveRooms.tsx',
    'src/components/liverooms/LiveRoomDrawer.tsx',
  ];
  for (const f of SITES) {
    it(`${f} builds share links with getLiveRoomShareUrl`, () => {
      const src = read(f);
      expect(src).toContain('getLiveRoomShareUrl(');
      expect(src).not.toMatch(/link:\s*`\$\{window\.location\.origin\}\/comm\/live-rooms\?live=/);
      expect(src).not.toMatch(/const url = `\$\{window\.location\.origin\}\/comm\/live-rooms\?live=/);
    });
  }
});
