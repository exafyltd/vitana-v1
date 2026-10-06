/**
 * VTID-04894 — the pre-login Commerce landing tells the story.
 *
 * Below the guest hero of /commerce: why Vitanaland, the one-step connection
 * (when the gateway serves it), the three getting-started steps (passed in —
 * they live on this page only) and a closing call to join.
 *
 * Owner decision 2026-10-05: this page may say "MCP" — prospective suppliers
 * need to understand how the one-step setup works. That is a deliberate,
 * narrow exception to the VTID-04796 wording rule: developer terms (connector
 * or provider IDs, OpenAPI, OAuth, scopes) stay off this page too, and the
 * normal onboarding flow keeps the full rule. The MCP address itself is not
 * shown here: using it needs an account.
 *
 * VTID-04898: while this landing is mounted the body carries
 * `commerce-guest-page`, so desktop widths dock the Vitana orb in a reserved
 * corner gutter instead of on the content (src/index.css).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronDown, Copy, HeartPulse, MessageSquareText, Plug, ShieldCheck, Sparkles, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n-toast';
import { SUPPORTED_ASSISTANTS } from '@/lib/commerce-mcp';

const K = 'screens.commerceportal.guest';

/** Body class: desktop widths keep the orb in a corner gutter on this page. */
export const GUEST_PAGE_CLASS = 'commerce-guest-page';

const WHY = [
  { icon: HeartPulse, title: `${K}.why1Title`, body: `${K}.why1Body` },
  { icon: ShieldCheck, title: `${K}.why2Title`, body: `${K}.why2Body` },
  { icon: Store, title: `${K}.why3Title`, body: `${K}.why3Body` },
] as const;

const FLOW = [
  { icon: Copy, label: `${K}.flow1` },
  { icon: Plug, label: `${K}.flow2` },
  { icon: MessageSquareText, label: `${K}.flow3` },
  { icon: Sparkles, label: `${K}.flow4` },
] as const;

interface CommerceGuestLandingProps {
  /** The gateway serves the MCP endpoint (public metadata check). */
  mcpReady: boolean;
  /** Goes to sign-up, back to /commerce afterwards. */
  onJoin: () => void;
  /** The getting-started steps (guest-only). */
  steps: ReactNode;
}

/** The join button label: the AI path once it is live, the plain join otherwise. */
export const guestCtaKey = (mcpReady: boolean) =>
  mcpReady ? 'screens.commerceportal.mcpConnect.cta' : 'screens.commerceportal.guestCta';

export function CommerceGuestLanding({ mcpReady, onJoin, steps }: CommerceGuestLandingProps) {
  const reduce = useReducedMotion();
  const [whatIsOpen, setWhatIsOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add(GUEST_PAGE_CLASS);
    return () => document.body.classList.remove(GUEST_PAGE_CLASS);
  }, []);
  const fade = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-60px' },
        transition: { duration: 0.5, ease: 'easeOut' as const },
      };

  return (
    <div data-testid="commerce-guest-landing">
      {/* WHY VITANALAND */}
      <motion.section {...fade} className="mt-12 md:mt-16" data-testid="guest-why">
        <h2 className="text-xl font-bold text-foreground md:text-2xl">{t(`${K}.whyTitle`)}</h2>
        <ul className="mt-6 grid gap-5 sm:grid-cols-3">
          {WHY.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-2xl border border-amber-200 bg-card p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-base font-bold text-foreground md:text-lg">{t(title)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(body)}</p>
            </li>
          ))}
        </ul>
      </motion.section>

      {/* CONNECT IN ONE STEP — only once the gateway serves it */}
      {mcpReady && (
        <motion.section
          {...fade}
          className="mt-12 rounded-3xl border border-amber-200 bg-gradient-to-b from-amber-50 to-card p-5 shadow-xl shadow-amber-900/5 md:mt-16 md:p-8"
          data-testid="guest-one-step"
        >
          <h2 className="text-xl font-bold text-foreground md:text-2xl">{t(`${K}.oneStepTitle`)}</h2>
          <p className="mt-2 text-base font-medium text-amber-900">{t(`${K}.oneStepLead`)}</p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">{t(`${K}.oneStepBody`)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(`${K}.oneStepWorksWith`)}{' '}
            <span className="font-medium text-foreground" dir="ltr">
              {SUPPORTED_ASSISTANTS.join(' · ')}
            </span>
          </p>

          <ol className="mt-6 grid gap-3 sm:grid-cols-4" data-testid="guest-flow">
            {FLOW.map(({ icon: Icon, label }, i) => (
              <li key={label} className="relative flex items-center gap-3 rounded-2xl border border-amber-200 bg-card p-4 sm:flex-col sm:items-start">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Icon className="h-4 w-4 shrink-0 text-amber-700" />
                  {t(label)}
                </span>
                {i < FLOW.length - 1 && (
                  <ArrowRight
                    aria-hidden
                    className="absolute -end-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-amber-400 sm:block rtl:rotate-180"
                  />
                )}
              </li>
            ))}
          </ol>

          <p className="mt-5 rounded-xl bg-card/80 p-3 text-sm leading-relaxed text-muted-foreground">
            <ShieldCheck className="me-1.5 inline h-4 w-4 align-text-bottom text-amber-700" />
            {t(`${K}.oneStepControl`)}
          </p>

          <button
            type="button"
            onClick={() => setWhatIsOpen((v) => !v)}
            aria-expanded={whatIsOpen}
            data-testid="guest-what-is-mcp"
            className="mt-4 flex min-h-11 items-center gap-1.5 text-start text-sm font-semibold text-amber-800 hover:text-amber-900"
          >
            {t(`${K}.whatIsMcp`)}
            <ChevronDown className={`h-4 w-4 transition-transform ${whatIsOpen ? 'rotate-180' : ''}`} />
          </button>
          {whatIsOpen && (
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground" data-testid="guest-what-is-mcp-body">
              {t(`${K}.whatIsMcpBody`)}
            </p>
          )}

          <Button
            size="lg"
            onClick={onJoin}
            className="mt-6 h-12 w-full rounded-xl bg-amber-700 px-8 text-base font-semibold text-white shadow-sm hover:bg-amber-800 sm:w-auto"
          >
            {t('screens.commerceportal.mcpConnect.cta')}
          </Button>
        </motion.section>
      )}

      {/* GETTING STARTED — lives on this page only */}
      <div className="mt-12 md:mt-16">{steps}</div>

      {/* CLOSING */}
      <motion.section
        {...fade}
        className="mt-12 rounded-3xl bg-amber-700 px-6 py-10 text-center text-white md:mt-16 md:px-10"
        data-testid="guest-closing"
      >
        <h2 className="mx-auto max-w-2xl text-2xl font-bold leading-tight md:text-3xl">{t(`${K}.closingTitle`)}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-amber-50 md:text-base">{t(`${K}.closingBody`)}</p>
        <Button
          size="lg"
          onClick={onJoin}
          className="mt-6 h-12 w-full rounded-xl bg-white px-8 text-base font-semibold text-amber-800 hover:bg-amber-50 sm:w-auto"
        >
          {t(guestCtaKey(mcpReady))}
        </Button>
      </motion.section>
    </div>
  );
}
