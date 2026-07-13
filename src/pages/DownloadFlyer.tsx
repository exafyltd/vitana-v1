/**
 * MAXINA download flyer — public, no-auth landing page shared via the
 * "Invite a friend" flow. Renders the app pitch with App Store / Google
 * Play badges linking to the store listings.
 *
 * Language: the invite link carries the SENDER's app language as ?lang=
 * (de|en). We force that locale for this page so a German user's flyer is
 * German for the recipient regardless of the recipient's device settings;
 * without a valid param the app's normal detection applies (de default).
 */

import { useEffect, useReducer } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Compass, HeartPulse, Leaf, Users, Heart } from 'lucide-react';
import SEO from '@/components/SEO';
import { ensureCatalog, onCatalogLoaded } from '@/i18n';
import { setI18nLocale, t } from '@/lib/i18n-toast';
import { isAppilix, launchExternal } from '@/lib/appilix';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/store-links';

/** GA locales only — draft locales fall back to normal detection (de). */
const LANG_TO_LOCALE: Record<string, string> = {
  de: 'de-DE',
  en: 'en-US',
};

function StoreBadge({ href, src, alt }: { href: string; src: string; alt: string }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Inside the Appilix WebView the store listing must open in the device
    // browser / store app, not inside the shell.
    if (isAppilix()) {
      e.preventDefault();
      launchExternal(href);
    }
  };
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={handleClick} className="inline-block transition-transform hover:scale-105">
      <img src={src} alt={alt} className="h-12 w-auto" />
    </a>
  );
}

function FeatureRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{body}</p>
      </div>
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
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-indigo-50 to-orange-50 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900">
      <SEO
        title={t('screens.downloadFlyer.seoTitle')}
        description={t('screens.downloadFlyer.seoDescription')}
        canonical="https://vitanaland.com/download"
      />
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-12 text-center">
        {/* Brand */}
        <h1 className="text-3xl font-light tracking-[0.4em] text-indigo-950 dark:text-indigo-100">
          {t('screens.downloadFlyer.brandName')}
        </h1>
        <div className="mt-2 flex w-32 items-center gap-2 text-amber-500/80" aria-hidden="true">
          <span className="h-px flex-1 bg-current" />
          <Heart className="h-3 w-3 fill-current" />
          <span className="h-px flex-1 bg-current" />
        </div>
        <p className="mt-1 font-serif italic text-amber-600/90 dark:text-amber-400/90">
          {t('screens.downloadFlyer.brandSubline')}
        </p>

        {/* Headline */}
        <h2 className="mt-8 font-serif text-4xl font-bold leading-tight text-indigo-950 dark:text-indigo-50">
          {t('screens.downloadFlyer.headline')}
        </h2>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
          {t('screens.downloadFlyer.tagline')}
        </p>

        {/* Features */}
        <div className="mt-10 w-full space-y-5 rounded-3xl bg-white/70 p-6 text-left shadow-sm backdrop-blur dark:bg-white/5">
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
        <div className="mt-8 w-full rounded-3xl bg-gradient-to-r from-sky-200/80 via-indigo-200/80 to-orange-200/80 p-6 shadow-sm dark:from-sky-500/20 dark:via-indigo-500/20 dark:to-orange-500/20">
          <p className="font-serif text-2xl font-bold text-indigo-950 dark:text-indigo-50">
            {t('screens.downloadFlyer.joinTitle')}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
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
