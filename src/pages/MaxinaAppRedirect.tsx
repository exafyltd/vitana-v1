import { useCallback, useEffect, useState } from 'react';
import SEO from '@/components/SEO';
import { t, notifySuccess, notifyError } from '@/lib/i18n-toast';
import { redirectViaSystemBrowser } from '@/lib/webview';
import { detectInAppBrowser, type InAppBrowser } from '@/lib/in-app-browser';
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  PLAY_STORE_MARKET_URL,
  MAXINA_APP_QR_URL,
} from '@/lib/store-links';

/**
 * MAXINA app-store landing page — public, no-auth. Used by the printed merch
 * QR code and by the link in our Instagram bio.
 *
 * This is deliberately the ordinary "link in bio" pattern that Linktree and
 * Branch deepviews use: a calm branded page with plain store buttons the
 * visitor taps. It is not clever, and that is the point.
 *
 * Two things were tried here and removed, so they don't get reintroduced:
 *
 *   1. An automatic redirect on iOS inside a social webview. Those webviews
 *      drop a top-level navigation that no user gesture initiated, so it
 *      cannot land — it only delays the page the visitor actually needs.
 *   2. An `x-safari-https://` "open in Safari" button. Instagram actively
 *      intercepts and blocks that scheme with no error and no fallback, so
 *      the button did nothing on essentially every visit, and the failure
 *      notice it showed became the default experience. A prominent warning
 *      on a download page reads as "this link is unsafe" and costs more
 *      installs than the redirect it was trying to rescue.
 *
 * What remains is what actually works: outside a webview we redirect
 * immediately; inside one we render tapped store links, which is how every
 * link-in-bio service handles this, plus a quiet hint about the browser
 * menu for the cases where the store still doesn't open.
 */

type Platform = 'ios' | 'android' | 'other';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

export default function MaxinaAppRedirect() {
  const [platform] = useState<Platform>(detectPlatform);
  const [inApp] = useState<InAppBrowser | null>(() => detectInAppBrowser());

  // iOS inside a webview is the one combination with no automatic route:
  // apps.apple.com answers every iOS user agent with a redirect into the
  // itms-appss:// scheme, and a gesture-less navigation there is dropped.
  // The visitor taps a store button instead, like on any link-in-bio page.
  const iosInWebview = platform === 'ios' && inApp !== null;

  useEffect(() => {
    if (platform === 'other' || iosInWebview) return;

    if (inApp) {
      // Android in a webview: play.google.com renders normally here, so the
      // plain https listing works. market:// and intent:// are blocked.
      window.location.href = PLAY_STORE_URL;
      return;
    }

    if (platform === 'ios') {
      redirectViaSystemBrowser(APP_STORE_URL);
      return;
    }

    // Android, real browser: market:// gives the smoother "open in Play
    // Store app" handoff, with the https listing as the fallback.
    window.location.href = PLAY_STORE_MARKET_URL;
    const timer = window.setTimeout(() => {
      if (!document.hidden) redirectViaSystemBrowser(PLAY_STORE_URL);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [platform, inApp, iosInWebview]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(MAXINA_APP_QR_URL);
      notifySuccess('screens.maxinaAppRedirect.linkCopied');
    } catch {
      notifyError('screens.maxinaAppRedirect.copyFailed');
    }
  }, []);

  const primaryStoreUrl =
    platform === 'ios'
      ? APP_STORE_URL
      : platform === 'android'
        ? PLAY_STORE_URL
        : null;

  // "Redirecting" is only honest where a redirect is actually running.
  const statusLabel =
    iosInWebview || platform === 'other'
      ? t('screens.maxinaAppRedirect.fallbackBody')
      : inApp
        ? t('screens.maxinaAppRedirect.tapToDownload')
        : t('screens.maxinaAppRedirect.redirecting');

  const showsButtons = iosInWebview || platform === 'other' || inApp !== null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 py-10 text-center">
      <SEO
        title={t('screens.maxinaAppRedirect.seoTitle')}
        canonical="https://vitanaland.com/maxina/app"
        noindex
      />
      <img
        src="/images/maxina-logo.png"
        alt=""
        aria-hidden="true"
        className={`h-20 w-20 rounded-2xl ${showsButtons ? '' : 'animate-pulse'}`}
      />

      <p className="max-w-xs text-sm text-muted-foreground">{statusLabel}</p>

      {primaryStoreUrl && (
        <a
          href={primaryStoreUrl}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg"
        >
          {platform === 'ios'
            ? t('screens.maxinaAppRedirect.ctaAppStore')
            : t('screens.maxinaAppRedirect.ctaPlayStore')}
        </a>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4">
        <a href={APP_STORE_URL} rel="noopener">
          <img
            src="/images/badges/app-store-badge.svg"
            alt={t('screens.downloadFlyer.badgeAppStoreAlt')}
            className="h-14 w-auto"
          />
        </a>
        <a href={PLAY_STORE_URL} rel="noopener">
          <img
            src="/images/badges/google-play-badge.svg"
            alt={t('screens.downloadFlyer.badgeGooglePlayAlt')}
            className="h-14 w-auto"
          />
        </a>
      </div>

      {/* Quiet, neutral, and only inside a webview. Phrased as a tip rather
          than a warning — this page's job is to look like a safe download
          page, not to raise an alarm about the browser the visitor is in. */}
      {inApp && (
        <>
          <p className="max-w-xs text-xs text-muted-foreground">
            {t('screens.maxinaAppRedirect.inAppHint')}
          </p>
          <button
            type="button"
            onClick={copyLink}
            className="text-xs font-medium text-muted-foreground underline"
          >
            {t('screens.maxinaAppRedirect.copyLink')}
          </button>
        </>
      )}
    </div>
  );
}
