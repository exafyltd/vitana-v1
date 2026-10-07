/**
 * VTID-04945 — privacy notice for the Vitanaland Commerce connector (the
 * Claude Connectors Directory requires a public privacy policy URL). It covers
 * only what the connector adds; the Vitanaland privacy policy covers the rest.
 * No sign-in. The wording needs the owner's approval before it is published.
 */
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n-toast';

const K = 'commerceConnect';
const SUPPORT_EMAIL = 'support@exafy.io';
const WHAT = ['privacyWhat1', 'privacyWhat2', 'privacyWhat3'] as const;
const SECTIONS = [
  ['privacyWhoTitle', 'privacyWhoBody'],
  ['privacyWhyTitle', 'privacyWhyBody'],
  ['privacyShareTitle', 'privacyShareBody'],
  ['privacyKeepTitle', 'privacyKeepBody'],
] as const;

export default function CommerceConnectPrivacy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background" data-testid="commerce-connect-privacy">
      <SEO title={t(`${K}.privacyTitle`)} description={t(`${K}.privacyIntro`)} canonical="https://vitanaland.com/commerce/connect/privacy" />
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t(`${K}.back`)}>
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <span className="font-semibold">{t(`${K}.privacyLink`)}</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <h1 className="text-2xl font-bold leading-tight text-foreground md:text-3xl">{t(`${K}.privacyTitle`)}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(`${K}.privacyIntro`)}</p>

        {SECTIONS.slice(0, 1).map(([title, body]) => (
          <section key={title} className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">{t(`${K}.${title}`)}</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{t(`${K}.${body}`)}</p>
          </section>
        ))}

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">{t(`${K}.privacyWhatTitle`)}</h2>
          <ul className="mt-2 list-disc space-y-1.5 ps-5 text-sm leading-relaxed text-foreground/90">
            {WHAT.map((k) => <li key={k}>{t(`${K}.${k}`)}</li>)}
          </ul>
        </section>

        {SECTIONS.slice(1).map(([title, body]) => (
          <section key={title} className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">{t(`${K}.${title}`)}</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{t(`${K}.${body}`)}</p>
          </section>
        ))}

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">{t(`${K}.privacyRightsTitle`)}</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            {t(`${K}.privacyRightsBody`)}{' '}
            <a className="text-primary underline underline-offset-2 hover:no-underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
        </section>

        <p className="mt-10 text-sm">
          <Link className="text-primary underline underline-offset-2 hover:no-underline" to="/privacy">{t(`${K}.policyLink`)}</Link>
        </p>
      </main>
    </div>
  );
}
