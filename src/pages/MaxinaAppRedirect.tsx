import { useEffect, useState } from 'react';
import SEO from '@/components/SEO';
import { t } from '@/lib/i18n-toast';
import { redirectViaSystemBrowser } from '@/lib/webview';
import { detectInAppBrowser, type InAppBrowser } from '@/lib/in-app-browser';
import { APP_STORE_URL, PLAY_STORE_URL, PLAY_STORE_MARKET_URL } from '@/lib/store-links';

/**
 * MAXINA app-store redirect — public, no-auth page whose sole job is
 * getting a phone onto the correct native app-store listing as fast as
 * possible. Reached from the printed merch QR code AND from the link we
 * publish in Instagram/social bios.
 *
 * Two audiences with very different constraints:
 *
 *   - System browser / WhatsApp: the programmatic redirect lands, so the
 *     visitor never really sees this page. Fast path, unchanged.
 *   - Social in-app browsers (Instagram above all): a gesture-less
 *     `window.location` navigation is silently dropped, and `market://` /
 *     `intent://` are blocked outright. The redirect CANNOT be trusted.
 *
 * Hence the invariant this page must never lose: a real, tappable store
 * link is ALWAYS rendered, on every platform. The auto-redirect is an
 * optimisation layered on top, never the only way out. Previously the
 * store badges rendered only for desktop (`platform === 'other'`), so
 * when the redirect was dropped inside Instagram the visitor was left
 * staring at a "redirecting…" line with no way forward at all.
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

  useEffect(() => {
    if (platform === 'other') return;

    if (inApp) {
      // In-app browser: market:// and intent:// are blocked, and the
      // navigation below is usually dropped for lack of a user gesture.
      // Attempt the plain https store URL anyway — some webviews (e.g.
      // Facebook's) do honour it — but the tappable CTA rendered below is
      // what actually carries the visitor when this is ignored.
      window.location.href =
        platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
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
  }, [platform, inApp]);

  const primaryStoreUrl =
    platform === 'ios'
      ? APP_STORE_URL
      : platform === 'android'
        ? PLAY_STORE_URL
        : null;

  // Only claim to be redirecting when a redirect is actually expected to
  // land. Inside an in-app browser it usually will not, so ask for the tap.
  const statusLabel = inApp
    ? t('screens.maxinaAppRedirect.tapToDownload')
    : platform !== 'other'
      ? t('screens.maxinaAppRedirect.redirecting')
      : t('screens.maxinaAppRedirect.fallbackBody');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <SEO
        title={t('screens.maxinaAppRedirect.seoTitle')}
        canonical="https://vitanaland.com/maxina/app"
        noindex
      />
      <img
        src="/images/maxina-logo.png"
        alt=""
        aria-hidden="true"
        className={`h-20 w-20 rounded-2xl ${inApp ? '' : 'animate-pulse'}`}
      />

      <p className="max-w-xs text-sm text-muted-foreground">{statusLabel}</p>

      {/* Primary, platform-matched CTA. A real <a> so the tap is a genuine
          user gesture — the one navigation an in-app browser always allows. */}
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

      {/* Both badges stay available regardless of platform, so a wrong or
          unrecognised UA can never dead-end the visitor. */}
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

      {inApp && (
        <p className="max-w-xs text-xs text-muted-foreground">
          {t('screens.maxinaAppRedirect.inAppHint')}
        </p>
      )}
    </div>
  );
}
