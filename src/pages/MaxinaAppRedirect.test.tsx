/**
 * Regression tests for the black "Something went wrong. / Try Again" screen
 * Android members hit when the MAXINA app opened the link-in-bio page
 * (VTID-03490).
 *
 * `/maxina/app` auto-redirects on mount. `detectInAppBrowser()` deliberately
 * returns null for our own Appilix shell (see `lib/in-app-browser.ts`), so
 * inside the app Android used to fall through to the bottom of the effect and
 * fire a top-level `market://` navigation from a non-gesture effect. The
 * Appilix WebView has no handler for that scheme, so the navigation failed and
 * the native shell replaced the page with its own error screen — indis-
 * tinguishable, to a member, from "the app won't open".
 *
 * Android App Links make this trivial to reach: `assetlinks.json` claims
 * vitanaland.com with `handle_all_urls`, so tapping the QR / bio link on a
 * device that has MAXINA installed opens it *in* MAXINA. That is also the
 * documented in-app use of this page — pulling up the QR to show someone in
 * person — so the redirect was breaking the very case it was reached from.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/components/SEO', () => ({ default: () => null }));

vi.mock('@/lib/i18n-toast', () => ({
  t: (key: string) => key,
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

import MaxinaAppRedirect from './MaxinaAppRedirect';

/** Appilix Android shell: Android WebView, marked by the `wv` UA token. */
const APPILIX_ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A.231005.007; wv) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36';

/** Ordinary Android Chrome — no `wv` token, so not our shell. */
const ANDROID_CHROME_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

let assignedHrefs: string[] = [];
const realUserAgent = navigator.userAgent;

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
}

beforeEach(() => {
  assignedHrefs = [];
  vi.useFakeTimers();

  // Intercept top-level navigation: jsdom cannot navigate, and the assignment
  // itself is exactly what we are asserting on.
  Object.defineProperty(window, 'location', {
    value: {
      ...window.location,
      set href(url: string) {
        assignedHrefs.push(url);
      },
      get href() {
        return 'https://vitanaland.com/maxina/app';
      },
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
  setUserAgent(realUserAgent);
});

describe('MaxinaAppRedirect — inside the MAXINA (Appilix) shell', () => {
  it('never fires a market:// navigation that the WebView cannot resolve', () => {
    setUserAgent(APPILIX_ANDROID_UA);

    render(<MaxinaAppRedirect />);
    vi.runAllTimers();

    expect(assignedHrefs.filter((u) => u.startsWith('market://'))).toEqual([]);
  });

  it('does not navigate away at all — there is nothing to install', () => {
    setUserAgent(APPILIX_ANDROID_UA);

    render(<MaxinaAppRedirect />);
    vi.runAllTimers();

    expect(assignedHrefs).toEqual([]);
  });

  it('renders the tappable store links instead of claiming "redirecting"', () => {
    setUserAgent(APPILIX_ANDROID_UA);

    render(<MaxinaAppRedirect />);

    expect(
      screen.getByText('screens.maxinaAppRedirect.tapToDownload'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('screens.maxinaAppRedirect.redirecting'),
    ).not.toBeInTheDocument();
  });
});

describe('MaxinaAppRedirect — ordinary Android browser', () => {
  it('still hands off to the Play Store app via market://', () => {
    setUserAgent(ANDROID_CHROME_UA);

    render(<MaxinaAppRedirect />);

    expect(assignedHrefs[0]).toBe('market://details?id=com.vitanaland.app');
  });
});
