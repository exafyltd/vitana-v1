/**
 * MAXINA download flyer — public, no-auth landing page shared via the
 * "Invite a friend" flow. Premium "pearl" design after the marketing
 * flyer: gradient wordmark, serif headline, phone collage with real app
 * screens, glass cards, and App Store / Google Play badges.
 *
 * Language: the invite link carries the SENDER's app language as ?lang=
 * (de|en). We force that locale for this page so a German user's flyer is
 * German for the recipient regardless of the recipient's device settings;
 * without a valid param the app's normal detection applies (de default).
 *
 * Store badges: opened via redirectViaSystemBrowser (lib/webview), NOT the
 * Appilix `launch_external` bridge — the bridge gives no acknowledgment
 * and some shell builds silently drop the action, leaving the badge dead
 * (same failure mode webview.ts documents for OAuth). The shared link
 * opens inside the MAXINA app via App Links, so the WebView path is the
 * common case, not the exception.
 */

import { useEffect, useReducer } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Compass, HeartPulse, Leaf, Users, Heart, Mic, X } from 'lucide-react';
import SEO from '@/components/SEO';
import { ensureCatalog, onCatalogLoaded } from '@/i18n';
import { setI18nLocale, t } from '@/lib/i18n-toast';
import { redirectViaSystemBrowser } from '@/lib/webview';
import { APP_STORE_URL, PLAY_STORE_URL, PLAY_STORE_MARKET_URL } from '@/lib/store-links';
import { FrameWhen } from '@/components/layout/spotlight/FrameWhen';
import { useSpotlightEnabled } from '@/hooks/useSpotlightEnabled';

/** GA locales only — draft locales fall back to normal detection (de). */
const LANG_TO_LOCALE: Record<string, string> = {
  de: 'de-DE',
  en: 'en-US',
};

function StoreBadge({ href, marketHref, src, alt }: { href: string; marketHref?: string; src: string; alt: string }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Android + Play badge: the OS-native market:// link opens the Play
    // Store app directly (play.google.com refuses to render in WebViews).
    // If the store didn't take over (page still visible), fall back to the
    // https listing via the system browser.
    if (marketHref && typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)) {
      window.location.href = marketHref;
      window.setTimeout(() => {
        if (!document.hidden) redirectViaSystemBrowser(href);
      }, 1500);
      return;
    }
    // Everything else: the proven system-browser helper (Android WebView:
    // window.open "_system" → intent:// fallback; iOS WKWebView + plain
    // browsers: direct nav).
    redirectViaSystemBrowser(href);
  };
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={handleClick} className="inline-block transition-transform hover:scale-105">
      <img src={src} alt={alt} className="h-14 w-auto drop-shadow-md" />
    </a>
  );
}

function FeatureRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 text-start">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-category-2/15 text-category-2">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

/** White-bezel phone frame around a real app screenshot. */
function PhoneShot({ src, className, fill }: { src: string; className?: string; fill?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-[1.75rem] border-4 border-card bg-card shadow-2xl shadow-primary/20 dark:border-border ${className ?? ''}`}>
      <img src={src} alt="" aria-hidden="true" className={fill ? 'block h-full w-full object-cover object-top' : 'block w-full'} />
    </div>
  );
}

export default function DownloadFlyer() {
  const [searchParams] = useSearchParams();
  const spotlight = useSpotlightEnabled();
  const [, bump] = useReducer((x: number) => x + 1, 0);

  // Re-render once a lazily-loaded locale catalog (en) finishes loading.
  useEffect(() => onCatalogLoaded(bump), []);

  // Force the sender's language before first paint. de is bundled eagerly,
  // en re-renders via the catalog listener above.
  const forcedLocale = LANG_TO_LOCALE[searchParams.get('lang') ?? ''];
  if (forcedLocale) {
    setI18nLocale(forcedLocale);
    void ensureCatalog(forcedLocale);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-surface-page-via via-surface-page-from to-surface-page-to">
      {/* Iridescent pearl highlights */}
      <div aria-hidden="true" className="pointer-events-none absolute -start-24 top-24 h-72 w-72 rounded-full bg-category-2/20 blur-3xl dark:bg-category-2/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -end-24 top-96 h-72 w-72 rounded-full bg-category-7/20 blur-3xl dark:bg-category-7/10" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-24 start-1/4 h-72 w-72 rounded-full bg-category-5/20 blur-3xl dark:bg-category-5/10" />

      <SEO
        title={t('screens.downloadFlyer.seoTitle')}
        description={t('screens.downloadFlyer.seoDescription')}
        canonical="https://vitanaland.com/download"
      />

      {/* VTID-05117: Spotlight on → the flyer column inside the manifest's `collection` frame. */}
      <FrameWhen on={spotlight} archetype="collection" className="relative">
      <div className="relative mx-auto flex max-w-md flex-col items-center px-6 py-12 text-center">
        {/* Brand */}
        <h1 className="bg-gradient-to-r from-category-3 via-category-2 to-category-7 bg-clip-text text-4xl font-light tracking-[0.4em] text-transparent">
          {t('screens.downloadFlyer.brandName')}
        </h1>
        <div className="mt-3 flex w-32 items-center gap-2 text-category-2/70" aria-hidden="true">
          <span className="h-px flex-1 bg-current" />
          <Heart className="h-3 w-3 fill-current" />
          <span className="h-px flex-1 bg-current" />
        </div>
        <p className="mt-1 font-serif italic text-category-5">
          {t('screens.downloadFlyer.brandSubline')}
        </p>

        {/* Headline */}
        <h2 className="mt-8 font-serif text-[2.6rem] font-bold leading-[1.15] text-foreground">
          {t('screens.downloadFlyer.headline')}
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          {t('screens.downloadFlyer.tagline')}
        </p>

        {/* Phone collage — real app screens */}
        {/* design-allow-next-line: fixed stage height of the three absolutely positioned phone mock-ups (a composition, not a card) */}
        <div className="relative mt-12 h-[440px] w-full">
          {/* Side cards mirror each other: same size (w-36 h-64), same top
              offset, opposite edge inset and rotation as the orb card. */}
          <PhoneShot src="/images/flyer/phone-health.jpg" fill className="absolute -start-2 top-16 h-64 w-36 -rotate-6" />
          {/* Vitana orb card — replica of the real "Vitana speaking" screen:
              steel-blue orb (vitana-orb-clean.svg) with amber glow on a
              near-black screen, caption + mic/close controls. */}
          {/* VTID-05117: the replica app screen is dark in both themes — dark-theme tokens in a `dark` scope. */}
          <div className="dark absolute -end-2 top-16 flex h-64 w-36 rotate-6 flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[1.75rem] border-4 border-foreground bg-background shadow-2xl shadow-primary/30">
            <div className="relative">
              <div aria-hidden="true" className="absolute inset-0 -m-4 rounded-full bg-category-5/60 blur-xl" />
              <img
                src="/vitana-orb-clean.svg"
                alt={t('screens.vitanaIdentity.orbAlt')}
                className="relative h-20 w-20"
              />
            </div>
            <p className="text-[9px] font-medium text-category-5">
              {t('screens.common.vitanaSpeaking')}
            </p>
            <div aria-hidden="true" className="mt-1 flex gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-category-3/30">
                <Mic className="h-3.5 w-3.5 text-category-7" />
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            </div>
          </div>
          <PhoneShot src="/images/flyer/phone-news.jpg" className="relative z-10 mx-auto w-56" />
        </div>

        {/* Features */}
        <div className="z-10 -mt-6 w-full space-y-5 rounded-[2rem] bg-card/70 p-6 shadow-lg shadow-primary/10 backdrop-blur-md dark:bg-card/5">
          <FeatureRow
            icon={<Compass className="h-5 w-5" />}
            title={t('screens.downloadFlyer.featureJourneysTitle')}
            body={t('screens.downloadFlyer.featureJourneysBody')}
          />
          <FeatureRow
            icon={<HeartPulse className="h-5 w-5" />}
            title={t('screens.downloadFlyer.featureHealthTitle')}
            body={t('screens.downloadFlyer.featureHealthBody')}
          />
          <FeatureRow
            icon={<Users className="h-5 w-5" />}
            title={t('screens.downloadFlyer.featureCommunityTitle')}
            body={t('screens.downloadFlyer.featureCommunityBody')}
          />
          <FeatureRow
            icon={<Leaf className="h-5 w-5" />}
            title={t('screens.downloadFlyer.featureLifestyleTitle')}
            body={t('screens.downloadFlyer.featureLifestyleBody')}
          />
        </div>

        {/* Join card */}
        <div className="mt-8 w-full rounded-[2rem] bg-card/60 p-8 shadow-lg shadow-primary/10 backdrop-blur-md dark:bg-card/5">
          <p className="bg-gradient-to-r from-category-3 via-category-2 to-category-7 bg-clip-text font-serif text-3xl font-bold text-transparent">
            {t('screens.downloadFlyer.joinTitle')}
          </p>
          <div className="mx-auto mt-3 flex w-24 items-center gap-2 text-category-2/70" aria-hidden="true">
            <span className="h-px flex-1 bg-current" />
            <Heart className="h-3 w-3 fill-current" />
            <span className="h-px flex-1 bg-current" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {t('screens.downloadFlyer.joinSubtitle')}
          </p>
        </div>

        {/* Store badges */}
        {/* Both badges always visible (marketing decision) — each opens its
            own store; on the "wrong" platform Apple/Google simply show
            their info page. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <StoreBadge
            href={APP_STORE_URL}
            src="/images/badges/app-store-badge.svg"
            alt={t('screens.downloadFlyer.badgeAppStoreAlt')}
          />
          <StoreBadge
            href={PLAY_STORE_URL}
            marketHref={PLAY_STORE_MARKET_URL}
            src="/images/badges/google-play-badge.svg"
            alt={t('screens.downloadFlyer.badgeGooglePlayAlt')}
          />
        </div>
      </div>
      </FrameWhen>
    </div>
  );
}
