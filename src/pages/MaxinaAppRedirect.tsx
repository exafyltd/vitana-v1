import { useEffect, useState } from 'react';
import SEO from '@/components/SEO';
import { t } from '@/lib/i18n-toast';
import { redirectViaSystemBrowser } from '@/lib/webview';
import { APP_STORE_URL, PLAY_STORE_URL, PLAY_STORE_MARKET_URL } from '@/lib/store-links';

/**
 * MAXINA app-store QR redirect — public, no-auth page whose sole job is
 * getting a phone that just scanned a printed QR code (team merchandise)
 * onto the correct native app-store listing as fast as possible.
 *
 * Reached via the visitor's system browser after a QR scan — not the
 * Appilix WebView shell in the common case. redirectViaSystemBrowser is
 * still used (not raw window.location) so a link opened from inside the
 * app's own WebView still resolves correctly instead of trying to load an
 * app-store URL inside it.
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

  useEffect(() => {
    if (platform === 'ios') {
      redirectViaSystemBrowser(APP_STORE_URL);
      return;
    }
    if (platform === 'android') {
      // Native deep link opens the Play Store app directly; play.google.com
      // itself is fine in a normal mobile browser, but market:// gives the
      // smoother "open in Play Store app" handoff when it resolves.
      window.location.href = PLAY_STORE_MARKET_URL;
      const timer = window.setTimeout(() => {
        if (!document.hidden) redirectViaSystemBrowser(PLAY_STORE_URL);
      }, 1500);
      return () => window.clearTimeout(timer);
    }
    // 'other' (desktop / unrecognized UA): no auto-redirect, fallback UI below.
  }, [platform]);

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
        className="h-20 w-20 rounded-2xl animate-pulse"
      />
      {platform !== 'other' ? (
        <p className="text-sm text-muted-foreground">
          {t('screens.maxinaAppRedirect.redirecting')}
        </p>
      ) : (
        <>
          <p className="max-w-xs text-sm text-muted-foreground">
            {t('screens.maxinaAppRedirect.fallbackBody')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
              <img
                src="/images/badges/app-store-badge.svg"
                alt={t('screens.downloadFlyer.badgeAppStoreAlt')}
                className="h-14 w-auto"
              />
            </a>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
              <img
                src="/images/badges/google-play-badge.svg"
                alt={t('screens.downloadFlyer.badgeGooglePlayAlt')}
                className="h-14 w-auto"
              />
            </a>
          </div>
        </>
      )}
    </div>
  );
}
