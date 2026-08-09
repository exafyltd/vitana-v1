import { describe, expect, it } from 'vitest';
import { detectInAppBrowser, isInAppBrowser } from './in-app-browser';

/** Real user-agent strings captured from the respective apps. */
const UA = {
  instagramIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 302.0.0.23.113 (iPhone14,3; iOS 17_5; de_DE; de; scale=3.00; 1170x2532; 521550états)',
  instagramAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.113 Mobile Safari/537.36 Instagram 331.0.0.37.90 Android',
  facebookIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/468.0.0.47.108;FBBV/620681917]',
  tiktokAndroid:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 musical_ly_2023 BytedanceWebview/d8a21c6',
  // Works today — must stay on the fast redirect path.
  whatsAppIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  safariIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.179 Mobile Safari/537.36',
  desktop:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

describe('detectInAppBrowser', () => {
  it('identifies the Instagram webview on both platforms', () => {
    expect(detectInAppBrowser(UA.instagramIOS)).toBe('instagram');
    expect(detectInAppBrowser(UA.instagramAndroid)).toBe('instagram');
  });

  it('identifies other social webviews', () => {
    expect(detectInAppBrowser(UA.facebookIOS)).toBe('facebook');
    expect(detectInAppBrowser(UA.tiktokAndroid)).toBe('tiktok');
  });

  it('does not flag real browsers', () => {
    expect(detectInAppBrowser(UA.safariIOS)).toBeNull();
    expect(detectInAppBrowser(UA.chromeAndroid)).toBeNull();
    expect(detectInAppBrowser(UA.desktop)).toBeNull();
  });

  it('leaves WhatsApp on the fast path — its redirect already works', () => {
    expect(detectInAppBrowser(UA.whatsAppIOS)).toBeNull();
    expect(isInAppBrowser(UA.whatsAppIOS)).toBe(false);
  });

  it('treats an empty user agent as a normal browser', () => {
    expect(detectInAppBrowser('')).toBeNull();
  });

  it('exposes a boolean helper', () => {
    expect(isInAppBrowser(UA.instagramIOS)).toBe(true);
    expect(isInAppBrowser(UA.desktop)).toBe(false);
  });
});
