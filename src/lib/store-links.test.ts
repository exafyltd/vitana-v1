/**
 * VTID-05242 (mt-frontend-brand/brand-surface): store links come from the
 * tenant brand pack when present, else the Maxina constants.
 */
import { describe, expect, it } from 'vitest';
import {
  APP_STORE_URL,
  IOS_WEBVIEW_ESCAPE_URL,
  MAXINA_APP_QR_URL,
  MAXINA_STORE_LINKS,
  PLAY_STORE_URL,
  storeLinksFor,
} from '@/lib/store-links';

describe('storeLinksFor', () => {
  it('no brand pack → the Maxina constants, unchanged', () => {
    const maxina = {
      appStoreUrl: APP_STORE_URL,
      playStoreUrl: PLAY_STORE_URL,
      appQrUrl: MAXINA_APP_QR_URL,
      iosWebviewEscapeUrl: IOS_WEBVIEW_ESCAPE_URL,
    };
    expect(storeLinksFor()).toEqual(maxina);
    expect(storeLinksFor(null)).toEqual(maxina);
    expect(storeLinksFor({})).toEqual(maxina);
    expect(MAXINA_STORE_LINKS).toEqual(maxina);
  });

  it('the compiled Maxina values are the ones shipped today', () => {
    expect(APP_STORE_URL).toBe('https://apps.apple.com/de/app/maxina/id6742813861');
    expect(MAXINA_APP_QR_URL).toBe('https://vitanaland.com/maxina/app');
    expect(IOS_WEBVIEW_ESCAPE_URL).toBe('');
  });

  it('a brand pack with store URLs wins, field by field', () => {
    const links = storeLinksFor({
      app_store_url: 'https://apps.apple.com/app/acme/id1',
      app_qr_url: 'https://acme.example/app',
    });
    expect(links.appStoreUrl).toBe('https://apps.apple.com/app/acme/id1');
    expect(links.appQrUrl).toBe('https://acme.example/app');
    expect(links.playStoreUrl).toBe(PLAY_STORE_URL);
    expect(links.iosWebviewEscapeUrl).toBe(IOS_WEBVIEW_ESCAPE_URL);
  });

  it('ignores anything that is not an absolute https URL', () => {
    const links = storeLinksFor({
      app_store_url: 'javascript:alert(1)',
      play_store_url: 'http://play.example/app',
      app_qr_url: '/relative',
      ios_webview_escape_url: 'https://user:pw@evil.example/',
    });
    expect(links).toEqual(MAXINA_STORE_LINKS);
  });

  it('the result is a copy — the Maxina constants cannot be mutated through it', () => {
    const links = storeLinksFor();
    links.appStoreUrl = 'https://changed.example';
    expect(MAXINA_STORE_LINKS.appStoreUrl).toBe(APP_STORE_URL);
  });
});
