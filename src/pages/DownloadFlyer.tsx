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
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/store-links';

/** GA locales only — draft locales fall back to normal detection (de). */
const LANG_TO_LOCALE: Record<string, string> = {
  de: 'de-DE',
  en: 'en-US',
};

function StoreBadge({ href, src, alt }: { href: string; src: string; alt: string }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Route through the proven system-browser helper on every platform:
    // Android WebView (window.open "_system" → intent:// fallback), iOS
    // WKWebView (direct nav → Safari), plain browsers (direct nav).
    e.preventDefault();
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
    <div className="flex items-start gap-3 text-left">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{body}</p>
      </div>
    </div>
  );
}

/** White-bezel phone frame around a real app screenshot. */
function PhoneShot({ src, className }: { src: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[1.75rem] border-4 border-white bg-white shadow-2xl shadow-indigo-900/20 dark:border-slate-700 dark:bg-slate-800 ${className ?? ''}`}>
      <img src={src} alt="" aria-hidden="true" className="block w-full" />
    </div>
  );
}

export default function DownloadFlyer() {
  const [searchParams] = useSearchParams();
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-100 via-indigo-100/70 to-rose-50 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900">
      {/* Iridescent pearl highlights */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-violet-300/40 blur-3xl dark:bg-violet-500/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-96 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl dark:bg-sky-500/10" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-24 left-1/4 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-500/10" />

      <SEO
        title={t('screens.downloadFlyer.seoTitle')}
        description={t('screens.downloadFlyer.seoDescription')}
        canonical="https://vitanaland.com/download"
      />

      <div className="relative mx-auto flex max-w-md flex-col items-center px-6 py-12 text-center">
        {/* Brand */}
        <h1 className="bg-gradient-to-r from-indigo-700 via-violet-600 to-sky-500 bg-clip-text text-4xl font-light tracking-[0.4em] text-transparent dark:from-indigo-300 dark:via-violet-300 dark:to-sky-300">
          {t('screens.downloadFlyer.brandName')}
        </h1>
        <div className="mt-3 flex w-32 items-center gap-2 text-violet-400" aria-hidden="true">
          <span className="h-px flex-1 bg-current" />
          <Heart className="h-3 w-3 fill-current" />
          <span className="h-px flex-1 bg-current" />
        </div>
        <p className="mt-1 font-serif italic text-amber-600/90 dark:text-amber-400/90">
          {t('screens.downloadFlyer.brandSubline')}
        </p>

        {/* Headline */}
        <h2 className="mt-8 font-serif text-[2.6rem] font-bold leading-[1.15] text-indigo-950 dark:text-indigo-50">
          {t('screens.downloadFlyer.headline')}
        </h2>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
          {t('screens.downloadFlyer.tagline')}
        </p>

        {/* Phone collage — real app screens */}
        <div className="relative mt-12 h-[440px] w-full">
          <div className="absolute -left-4 top-10 w-36 -rotate-6">
            <PhoneShot src="/images/flyer/phone-home.jpg" />
          </div>
          {/* Vitana orb card — replica of the real "Vitana speaking" screen:
              steel-blue orb (vitana-orb-clean.svg) with amber glow on a
              near-black screen, caption + mic/close controls. */}
          <div className="absolute -right-2 top-16 flex h-64 w-36 rotate-6 flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[1.75rem] border-4 border-white bg-[#101318] shadow-2xl shadow-indigo-900/30 dark:border-slate-700">
            <div className="relative">
              <div aria-hidden="true" className="absolute inset-0 -m-4 rounded-full bg-amber-500/60 blur-xl" />
              <img
                src="/vitana-orb-clean.svg"
                alt={t('screens.vitanaIdentity.orbAlt')}
                className="relative h-20 w-20"
              />
            </div>
            <p className="text-[9px] font-medium text-amber-400/90">
              {t('screens.common.vitanaSpeaking')}
            </p>
            <div aria-hidden="true" className="mt-1 flex gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1e3a5f]">
                <Mic className="h-3.5 w-3.5 text-sky-300" />
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2a2f36]">
                <X className="h-3.5 w-3.5 text-slate-300" />
              </span>
            </div>
          </div>
          <PhoneShot src="/images/flyer/phone-news.jpg" className="relative z-10 mx-auto w-56" />
        </div>

        {/* Features */}
        <div className="z-10 -mt-6 w-full space-y-5 rounded-[2rem] bg-white/70 p-6 shadow-lg shadow-indigo-900/10 backdrop-blur-md dark:bg-white/5">
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
        <div className="mt-8 w-full rounded-[2rem] bg-white/60 p-8 shadow-lg shadow-indigo-900/10 backdrop-blur-md dark:bg-white/5">
          <p className="bg-gradient-to-r from-indigo-800 via-violet-700 to-sky-600 bg-clip-text font-serif text-3xl font-bold text-transparent dark:from-indigo-200 dark:via-violet-200 dark:to-sky-200">
            {t('screens.downloadFlyer.joinTitle')}
          </p>
          <div className="mx-auto mt-3 flex w-24 items-center gap-2 text-violet-400" aria-hidden="true">
            <span className="h-px flex-1 bg-current" />
            <Heart className="h-3 w-3 fill-current" />
            <span className="h-px flex-1 bg-current" />
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {t('screens.downloadFlyer.joinSubtitle')}
          </p>
        </div>

        {/* Store badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <StoreBadge
            href={APP_STORE_URL}
            src="/images/badges/app-store-badge.svg"
            alt={t('screens.downloadFlyer.badgeAppStoreAlt')}
          />
          <StoreBadge
            href={PLAY_STORE_URL}
            src="/images/badges/google-play-badge.svg"
            alt={t('screens.downloadFlyer.badgeGooglePlayAlt')}
          />
        </div>
      </div>
    </div>
  );
}
