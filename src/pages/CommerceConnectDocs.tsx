/**
 * VTID-04945 — public documentation for the Vitanaland Commerce connector
 * (the Claude Connectors Directory listing points here). No sign-in: a
 * supplier, or an Anthropic reviewer, reads how the connector works before
 * connecting it. The address and tool list come from lib/commerce-mcp.ts so
 * the page can never name a tool the gateway does not serve.
 */
import { ArrowLeft, Check, Plug } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { COMMERCE_MCP_TOOL_NAMES, COMMERCE_MCP_URL } from '@/lib/commerce-mcp';
import { t } from '@/lib/i18n-toast';

const K = 'commerceConnect';
const SUPPORT_EMAIL = 'support@exafy.io';

const STEPS = ['step1', 'step2', 'step3'] as const;
const CAN_DO = ['canDo1', 'canDo2', 'canDo3', 'canDo4', 'canDo5'] as const;
const STAYS = ['stays1', 'stays2', 'stays3', 'stays4'] as const;

export default function CommerceConnectDocs() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background" data-testid="commerce-connect-docs">
      <SEO title={t(`${K}.seoTitle`)} description={t(`${K}.seoDescription`)} canonical="https://vitanaland.com/commerce/connect" />
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t(`${K}.back`)}>
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <span className="font-semibold">{t(`${K}.seoTitle`)}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <p className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
          <Plug className="h-3.5 w-3.5" aria-hidden />
          {t(`${K}.badge`)}
        </p>
        <h1 className="mt-4 text-3xl font-bold leading-tight text-foreground">{t(`${K}.title`)}</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{t(`${K}.lead`)}</p>

        <div className="mt-6 rounded-2xl border bg-card p-4">
          <p className="text-sm font-medium text-foreground">{t(`${K}.addressLabel`)}</p>
          <code className="mt-2 block break-all rounded-lg bg-muted px-3 py-2 text-sm" dir="ltr" data-testid="connect-address">
            {COMMERCE_MCP_URL}
          </code>
        </div>

        <section className="mt-10" aria-labelledby="connect-steps">
          <h2 id="connect-steps" className="text-xl font-semibold text-foreground">{t(`${K}.stepsTitle`)}</h2>
          <ol className="mt-4 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{i + 1}</span>
                <div>
                  <h3 className="font-medium text-foreground">{t(`${K}.${s}Title`)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(`${K}.${s}Body`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10" aria-labelledby="connect-can-do">
          <h2 id="connect-can-do" className="text-xl font-semibold text-foreground">{t(`${K}.canDoTitle`)}</h2>
          <ul className="mt-4 space-y-2">
            {CAN_DO.map((k) => (
              <li key={k} className="flex gap-3 text-sm text-foreground/90">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <span>{t(`${K}.${k}`)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="connect-stays">
          <h2 id="connect-stays" className="text-xl font-semibold text-foreground">{t(`${K}.staysTitle`)}</h2>
          <ul className="mt-4 list-disc space-y-2 ps-5 text-sm leading-relaxed text-foreground/90">
            {STAYS.map((k) => <li key={k}>{t(`${K}.${k}`)}</li>)}
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="connect-tools">
          <h2 id="connect-tools" className="text-xl font-semibold text-foreground">{t(`${K}.toolsTitle`)}</h2>
          <dl className="mt-4 divide-y rounded-2xl border bg-card" data-testid="connect-tools">
            {COMMERCE_MCP_TOOL_NAMES.map((name) => (
              <div key={name} className="grid gap-1 px-4 py-3 md:grid-cols-[14rem_1fr]">
                <dt className="font-mono text-sm text-foreground" dir="ltr">{name}</dt>
                <dd className="text-sm text-muted-foreground">{t(`${K}.tool_${name}`)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-10" aria-labelledby="connect-data">
          <h2 id="connect-data" className="text-xl font-semibold text-foreground">{t(`${K}.dataTitle`)}</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">{t(`${K}.dataBody`)}</p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <li><Link className="text-primary underline underline-offset-2 hover:no-underline" to="/commerce/connect/privacy">{t(`${K}.privacyLink`)}</Link></li>
            <li><Link className="text-primary underline underline-offset-2 hover:no-underline" to="/privacy">{t(`${K}.policyLink`)}</Link></li>
            <li><Link className="text-primary underline underline-offset-2 hover:no-underline" to="/terms">{t(`${K}.termsLink`)}</Link></li>
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="connect-help">
          <h2 id="connect-help" className="text-xl font-semibold text-foreground">{t(`${K}.supportTitle`)}</h2>
          <p className="mt-3 text-sm text-foreground/90">
            {t(`${K}.supportBody`)}{' '}
            <a className="text-primary underline underline-offset-2 hover:no-underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
          <Button className="mt-6" variant="outline" asChild>
            <Link to="/commerce">{t(`${K}.ctaPortal`)}</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
