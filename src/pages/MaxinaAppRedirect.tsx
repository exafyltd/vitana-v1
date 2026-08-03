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
 * MAXINA app-store redirect — public, no-auth page that sends a phone to the
 * right store listing. Used by the printed merch QR code and by the link in
 * our Instagram bio.
 *
 * The iOS-inside-a-social-webview case cannot be solved by linking harder,
 * and it is worth being precise about why:
 *
 *   apps.apple.com answers EVERY iOS user agent with
 *     301 → itms-appss://apps.apple.com/...
 *   a custom scheme. Social in-app browsers refuse non-http(s) schemes, so
 *   the redirect dead-ends there. This holds for every apps.apple.com and
 *   itunes.apple.com URL shape (with/without slug, ?platform=, ?mt=8) —
 *   there is no Apple URL that serves HTML to an iPhone. So no navigation
 *   this page starts, whether from an effect or from a real user tap, can
 *   reach the App Store from inside Instagram.
 *
 *   Google Play is unaffected: play.google.com returns a normal 200 HTML
 *   page that the webview renders, which is why Android has always worked
 *   and iOS has not.
 *
 * Therefore, for iOS + in-app browser the page does NOT attempt a
 * navigation it knows will be swallowed. It leads with the one route that
 * does work — reopening the page in the system browser — and offers
 * copy-link so the visitor can paste it into Safari. The direct store link
 * is kept as a secondary action because some webviews (Facebook's, some
 * Instagram builds) do hand the scheme to the OS.
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
  // Set only after an "open in browser" attempt demonstrably did nothing.
  const [openFailed, setOpenFailed] = useState(false);

  // The combination Apple's own redirect makes unreachable — see file header.
  const iosWebviewBlocked = platform === 'ios' && inApp !== null;

  useEffect(() => {
    if (platform === 'other') return;

    // Never fire a navigation that cannot land: on iOS in a webview it only
    // burns time and can leave the webview in a half-navigated state.
    if (iosWebviewBlocked) return;

    if (inApp) {
      // Android in a webview: plain https Play Store URL. market:// and
      // intent:// are blocked here, but play.google.com renders fine.
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
  }, [platform, inApp, iosWebviewBlocked]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(MAXINA_APP_QR_URL);
      notifySuccess('screens.maxinaAppRedirect.linkCopied');
    } catch {
      notifyError('screens.maxinaAppRedirect.copyFailed');
    }
  }, []);

  /**
   * Hand this page to Safari, where the ordinary store redirect works.
   *
   * `x-safari-https://` is iOS's "open this URL in Safari" scheme. It is
   * worth attempting even though apps.apple.com's own redirect is refused,
   * because the two are NOT the same path: that failure is a *server 301*
   * into a custom scheme, which webviews block hardest, whereas this is a
   * scheme opened from a direct user tap. Some webviews pass those to the
   * OS.
   *
   * Some, however, swallow it — and there is no way to feature-detect a
   * scheme handler up front. So this never assumes it worked: if the
   * document is still visible shortly after, nothing happened, and we say
   * so and surface the manual route. A button that silently does nothing is
   * the exact defect VTID-03478 removed; it must not come back through this
   * door.
   */
  const openInBrowser = useCallback(() => {
    setOpenFailed(false);
    window.location.href = MAXINA_APP_QR_URL.replace(
      /^https:/,
      'x-safari-https:',
    );
    window.setTimeout(() => {
      if (!document.hidden) setOpenFailed(true);
    }, 1200);
  }, []);

  const primaryStoreUrl =
    platform === 'ios'
      ? APP_STORE_URL
      : platform === 'android'
        ? PLAY_STORE_URL
        : null;

  const statusLabel = iosWebviewBlocked
    ? t('screens.maxinaAppRedirect.iosBlockedBody')
    : inApp
      ? t('screens.maxinaAppRedirect.tapToDownload')
      : platform !== 'other'
        ? t('screens.maxinaAppRedirect.redirecting')
        : t('screens.maxinaAppRedirect.fallbackBody');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 py-10 text-center">
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

      {iosWebviewBlocked && (
        <h1 className="max-w-xs text-lg font-semibold text-foreground">
          {t('screens.maxinaAppRedirect.iosBlockedTitle')}
        </h1>
      )}

      <p className="max-w-xs text-sm text-muted-foreground">{statusLabel}</p>

      {/* iOS inside a webview: the system-browser escape is the ONLY route
          that reliably reaches the App Store, so it leads. */}
      {iosWebviewBlocked && (
        <>
          <button
            type="button"
            onClick={openInBrowser}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg"
          >
            {t('screens.maxinaAppRedirect.openInBrowser')}
          </button>

          {/* Before any attempt: the manual route, stated quietly. After an
              attempt that did nothing: the same route, stated loudly and
              named as a failure, so the tap never just evaporates. */}
          <p
            className={
              openFailed
                ? 'max-w-xs rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-foreground'
                : 'max-w-xs rounded-xl bg-muted px-4 py-3 text-sm font-medium text-foreground'
            }
          >
            {openFailed
              ? t('screens.maxinaAppRedirect.openFailed')
              : t('screens.maxinaAppRedirect.iosBlockedStep')}
          </p>

          <button
            type="button"
            onClick={copyLink}
            className="text-sm font-medium text-muted-foreground underline"
          >
            {t('screens.maxinaAppRedirect.copyLink')}
          </button>
        </>
      )}

      {/* Everything below is a link to a store listing, and on the iOS
          webview path EVERY such link is dead: apps.apple.com 301s to
          itms-appss://, which the webview refuses. Rendering a store badge
          or CTA there puts a control on screen that cannot do anything when
          tapped — worse than showing nothing, because it invites the tap and
          silently fails. So on that path we render only the copy-link button
          and the Safari instruction above, which do work. */}
      {!iosWebviewBlocked && (
        <>
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

          {/* Both badges stay available on every other path, so a wrong or
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
        </>
      )}

      {inApp && !iosWebviewBlocked && (
        <p className="max-w-xs text-xs text-muted-foreground">
          {t('screens.maxinaAppRedirect.inAppHint')}
        </p>
      )}
    </div>
  );
}
