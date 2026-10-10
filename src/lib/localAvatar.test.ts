/**
 * VTID-05066 — DiceBear auto-avatars drawn on the device must be the same SVG
 * the API serves. The fixtures were saved from api.dicebear.com on 2026-10-10
 * (package version 9.4.3) for the exact URLs below.
 */
import { afterEach, describe, expect, it } from 'vitest';
import botttsNeutralA from './__fixtures__/dicebear-9.4.3-bottts-neutral-seed-A.svg?raw';
import loreleiVitana from './__fixtures__/dicebear-9.4.3-lorelei-seed-vitana.svg?raw';
import { getAutoAvatarUrl } from './autoAvatar';
import { __clearLocalAvatarMemo, isDiceBear9Url, localAvatarDataUri, parseDiceBearUrl, peekLocalAvatar } from './localAvatar';

const BOTTTS_A = 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=A&backgroundType=gradientLinear&backgroundColor=ffd5dc&radius=50';
const LORELEI_VITANA = 'https://api.dicebear.com/9.x/lorelei/svg?seed=vitana&backgroundType=gradientLinear&backgroundColor=b6e3f4&radius=50';

function decode(dataUri: string): string {
  const comma = dataUri.indexOf(',');
  return decodeURIComponent(dataUri.slice(comma + 1));
}

afterEach(() => __clearLocalAvatarMemo());

describe('localAvatarDataUri', () => {
  it('renders the byte-identical SVG the API serves (bottts-neutral)', async () => {
    const uri = await localAvatarDataUri(BOTTTS_A);
    expect(uri).toMatch(/^data:image\/svg\+xml/);
    expect(decode(uri!)).toBe(botttsNeutralA);
  });

  it('renders the byte-identical SVG the API serves (lorelei)', async () => {
    expect(decode((await localAvatarDataUri(LORELEI_VITANA))!)).toBe(loreleiVitana);
  });

  it('remembers the result so a remount can paint it at once', async () => {
    expect(peekLocalAvatar(BOTTTS_A)).toBeUndefined();
    const uri = await localAvatarDataUri(BOTTTS_A);
    await Promise.resolve();
    expect(peekLocalAvatar(BOTTTS_A)).toBe(uri);
  });

  it('every URL autoAvatar builds is rendered locally, except the two over-budget styles', () => {
    let local = 0;
    for (let i = 0; i < 200; i++) {
      const url = getAutoAvatarUrl(`member-${i}`, { size: 64 });
      const style = new URL(url).pathname.split('/')[2];
      const parsed = parseDiceBearUrl(url);
      if (style === 'adventurer' || style === 'notionists') {
        expect(parsed).toBeNull(); // > 60 KB gz chunk: stays on api.dicebear.com
      } else {
        expect(parsed?.options.size).toBe(64);
        local++;
      }
    }
    expect(local).toBeGreaterThan(150);
  });

  it('returns null for anything it does not fully understand', async () => {
    for (const url of [
      'https://example.com/a.png',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=11',
      'https://api.dicebear.com/9.x/avataaars/svg?seed=1', // style autoAvatar does not use
      'https://api.dicebear.com/9.x/lorelei/svg?seed=1&flip=true', // unknown parameter
      'https://api.dicebear.com/9.x/lorelei/png?seed=1',
    ]) {
      expect(await localAvatarDataUri(url)).toBeNull();
    }
  });

  it('isDiceBear9Url is a plain prefix check', () => {
    expect(isDiceBear9Url(BOTTTS_A)).toBe(true);
    expect(isDiceBear9Url('https://api.dicebear.com/7.x/a/svg')).toBe(false);
    expect(isDiceBear9Url(undefined)).toBe(false);
  });
});
