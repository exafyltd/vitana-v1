/**
 * Vitanaland Commerce — the whole merchant portal on one screen (VTID-03882).
 *
 * Replaces `CommerceLanding`, `CommerceConnections` and `CommerceAgentConnect`,
 * and absorbs `CommerceConnectionDetail` as a drawer. A merchant used to walk
 * four URLs to do one thing, and the one genuinely remarkable part — point your
 * own AI at Vitanaland — sat on the third of them, styled as documentation.
 *
 * VTID-04055: reworked into a light, premium landing page (owner feedback on
 * two staging screenshots — cluttered, dark, CTAs blended with explanatory
 * text). A hero (headline + the two real CTAs — primary "Connect via AI
 * Agent", secondary "Register your business" — nothing else, so both read as
 * unmistakable buttons, not sentences with a button in them); the agent card
 * itself directly below, still first among the merchant-integration surfaces
 * so it stays the visual focal point; a numbered "what happens next"
 * stepper; a bounded manual-options card with two real buttons (previously a
 * solid button next to a plain underlined link — the exact "CTA mixed with
 * text" complaint); then the existing organizations/connections sections.
 * Owner decision: AI-agent connect is always the primary CTA, manual
 * registration a clear secondary one — never removed, never equal weight.
 * The relative order of `{hasOrgs && orgsSection}` / `<AgentConnectCard />` /
 * `{!hasOrgs && orgsSection}` is preserved exactly (VTID-03989's returning-
 * member hoist, pinned by `business-modes.test.ts`) — only the styling and
 * the hero above it changed.
 *
 * Data layer unchanged: plain useState + `adminFetch` against the owner-scoped
 * `/api/v1/vcaop/portal/my` surface. These screens never used React Query and
 * swapping state libraries is not what this change is about.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Building2,
  ChevronRight,
  FlaskConical,
  Loader2,
  PackagePlus,
  ShieldCheck,
  Sparkles,
  Store,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommerceShell } from '@/components/commerce/CommerceShell';
import { AgentConnectCard } from '@/components/commerce/AgentConnectCard';
import { ConnectionCard, type ConnectionRow } from '@/components/commerce/ConnectionCard';
import { ConnectionWorkbench } from '@/components/commerce/ConnectionWorkbench';
import { ManualConnectDialog } from '@/components/commerce/ManualConnectDialog';
import { AddProductSheet } from '@/components/commerce/AddProductSheet';
import { RegisterOrgDialog } from '@/components/commerce/RegisterOrgDialog';
import { MyOrgCard, type MyOrgRow } from '@/components/commerce/MyOrgCard';
import { PartnerOrgRoster } from '@/components/commerce/PartnerOrgRoster';
import { adminFetch } from '@/lib/admin-api';
import { MY_PORTAL_API, PARTNER_ORGS_API } from '@/lib/commerce-host';
import { t, notifyError } from '@/lib/i18n-toast';
import { businessHomeFor, setActiveOrgId } from '@/lib/business-mode';

const STEPS = [
  { icon: Store, title: 'screens.commerceportal.step1Title', body: 'screens.commerceportal.step1Body' },
  { icon: Workflow, title: 'screens.commerceportal.step2Title', body: 'screens.commerceportal.step2Body' },
  { icon: ShieldCheck, title: 'screens.commerceportal.step3Title', body: 'screens.commerceportal.step3Body' },
] as const;

/** The drawer is driven by the URL so a connection stays deep-linkable. */
const CONNECTION_PARAM = 'connection';
/** Same pattern, for the partner-org roster drawer (VTID-03936). */
const ORG_PARAM = 'org';

export default function CommercePortal() {
  const [rows, setRows] = useState<ConnectionRow[] | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [registerOrgOpen, setRegisterOrgOpen] = useState(false);
  const [myOrgs, setMyOrgs] = useState<MyOrgRow[] | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const agentCardRef = useRef<HTMLElement>(null);

  const openConnectionId = searchParams.get(CONNECTION_PARAM);
  const openOrgId = searchParams.get(ORG_PARAM);

  const load = useCallback(async () => {
    try {
      const res = await adminFetch(`${MY_PORTAL_API}/connections`);
      setRows(res.data ?? []);
    } catch {
      setRows([]);
      notifyError('screens.partnerportal.loadFailed');
    }
  }, []);

  const loadMyOrgs = useCallback(async () => {
    try {
      const res = await adminFetch(`${PARTNER_ORGS_API}/mine`);
      setMyOrgs(res.organizations ?? []);
    } catch {
      setMyOrgs([]);
      notifyError('screens.commerceportal.orgOnboarding.orgsLoadFailed');
    }
  }, []);

  const loadMyOrgsRef = useRef(loadMyOrgs);
  loadMyOrgsRef.current = loadMyOrgs;

  // VTID-03999: a freshly registered business becomes the active business
  // mode and its admin lands on the team page, where invitations are sent.
  const onOrgRegistered = useCallback(
    async (org: MyOrgRow | null) => {
      await loadMyOrgsRef.current();
      if (org) {
        setActiveOrgId(org.id);
        navigate(businessHomeFor('org_admin'));
      }
    },
    [navigate],
  );

  useEffect(() => {
    void load();
    void loadMyOrgs();
  }, [load, loadMyOrgs]);

  const openOrgRoster = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(ORG_PARAM, id);
      return next;
    });
  };

  const closeOrgRoster = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(ORG_PARAM);
        return next;
      },
      { replace: true },
    );
  };

  const openConnection = (id: string) => {
    // `replace: false` on open / `true` on close: Back should dismiss the
    // drawer once, not walk back through every connection you peeked at.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(CONNECTION_PARAM, id);
      return next;
    });
  };

  const closeConnection = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(CONNECTION_PARAM);
        return next;
      },
      { replace: true },
    );
  };

  const scrollToAgentCard = () => {
    agentCardRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  };

  const fade = reduce
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: 'easeOut' as const } };

  // VTID-03989: a returning business user wants their organization, not the
  // merchant pitch — hoist this section above the hero's supporting bands
  // once they belong to one. A first-time visitor still gets the pitch
  // first. VTID-04055: this section is no longer gated behind `lg:` in
  // either position — a narrow desktop/host browser window used to lose it
  // entirely when the visitor had no org yet, which is the opposite of
  // "clear how to register" at every width.
  const hasOrgs = (myOrgs?.length ?? 0) > 0;
  const orgsSection = (
    <>
      {/* YOUR ORGANIZATIONS — Commerce Partner Onboarding (VTID-03936) */}
      <section className="mt-12 md:mt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {t('screens.commerceportal.orgOnboarding.sectionTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('screens.commerceportal.orgOnboarding.sectionSubtitle')}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setRegisterOrgOpen(true)}
            className="border-amber-300 bg-background text-amber-800 hover:bg-amber-50"
          >
            <Building2 className="me-2 h-4 w-4" />
            {t('screens.commerceportal.orgOnboarding.registerCta')}
          </Button>
        </div>

        <div className="mt-4">
          {myOrgs === null ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : myOrgs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">{t('screens.commerceportal.orgOnboarding.orgsEmpty')}</p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {myOrgs.map((org) => (
                <li key={org.id}>
                  <MyOrgCard org={org} onManage={openOrgRoster} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Health-test orders — Commerce Partner Onboarding Phase 4 (VTID-03951) */}
        {myOrgs !== null && myOrgs.length > 0 && (
          <Link
            to="/commerce/health-orders"
            className="group mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-amber-400/60 hover:bg-card"
          >
            <FlaskConical className="h-5 w-5 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{t('screens.commerceportal.healthOrders.sectionTitle')}</p>
              <p className="truncate text-xs text-muted-foreground">{t('screens.commerceportal.healthOrders.sectionSubtitle')}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-amber-700 rtl:rotate-180" />
          </Link>
        )}
      </section>
    </>
  );

  return (
    <CommerceShell>
      {/* HERO — headline, subhead, and the two real CTAs. Nothing else here,
          so both buttons read unmistakably as buttons, not as one sentence
          among several with a button attached. Visible at every width. */}
      <motion.section {...fade} className="pt-6 text-center lg:pt-16">
        <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          {t('screens.commerceportal.portalEyebrow')}
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl text-2xl font-semibold leading-tight text-foreground lg:text-5xl">
          {t('screens.commerceportal.heroTitle')}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:mt-4 md:text-base">
          {t('screens.commerceportal.heroSubtitle')}
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            onClick={scrollToAgentCard}
            className="h-12 w-full rounded-xl bg-amber-700 px-6 text-base font-semibold text-white shadow-sm hover:bg-amber-800 sm:w-auto"
          >
            <Sparkles className="me-2 h-4 w-4" />
            {t('screens.commerceportal.agentConnect.title')}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setRegisterOrgOpen(true)}
            className="h-12 w-full rounded-xl border-amber-300 bg-background px-6 text-base font-semibold text-amber-800 hover:bg-amber-50 sm:w-auto"
          >
            <Building2 className="me-2 h-4 w-4" />
            {t('screens.commerceportal.orgOnboarding.registerCta')}
          </Button>
        </div>
      </motion.section>

      {hasOrgs && orgsSection}

      {/* VTID-03999: the merchant-integration pitch, steps, VCAOP connections
          and manual fallback are desktop-portal surfaces (`ConnectionWorkbench`,
          `AgentConnectCard` keep this skin). In the phone app the page is the
          business overview: hero + your organizations. `lg:` matches
          useIsMobile's 1024px breakpoint, not Tailwind's md. */}
      <div className="hidden lg:block">
        {/* CONNECT VIA AI AGENT — the primary CTA's scroll target, and still
            the first thing shown among the merchant-integration surfaces, so
            it stays the visual focal point exactly as before (VTID-03882's
            own framing: "this is what the product is"). */}
        <motion.section
          ref={agentCardRef}
          {...(reduce ? {} : { ...fade, transition: { duration: 0.5, delay: 0.1, ease: 'easeOut' as const } })}
          className="mx-auto mt-8 max-w-3xl scroll-mt-24 md:mt-10"
        >
          <AgentConnectCard />
        </motion.section>

        {/* WHAT HAPPENS NEXT */}
        <section className="mt-4 md:mt-6">
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {t('screens.commerceportal.howItWorksTitle')}
          </h2>
          <ol className="relative mt-5 grid gap-6 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="relative">
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute start-full top-6 hidden h-px w-6 -translate-x-3 bg-border sm:block rtl:translate-x-3"
                  />
                )}
                <div className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-amber-300">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-sm font-semibold text-amber-800">
                      {i + 1}
                    </span>
                    <Icon className="h-4 w-4 text-amber-700" />
                  </div>
                  <h3 className="mt-3.5 font-medium text-foreground">{t(title)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(body)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* PREFER TO DO IT YOURSELF — a real, bounded secondary card. Both
            options are equal-weight real buttons now, replacing the old
            solid-button-next-to-ghost-link row. */}
        <section className="mt-12 rounded-2xl border border-border bg-card p-6 md:mt-16">
          <h2 className="text-sm font-medium text-foreground">{t('screens.commerceportal.manualIntro')}</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => setAddProductOpen(true)}
              className="h-11 flex-1 rounded-xl bg-amber-700 font-semibold text-white hover:bg-amber-800"
            >
              <PackagePlus className="me-2 h-4 w-4" />
              {t('screens.commerceportal.addProduct')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setManualOpen(true)}
              className="h-11 flex-1 rounded-xl border-amber-300 bg-background font-semibold text-amber-800 hover:bg-amber-50"
            >
              {t('screens.commerceportal.manualCta')}
            </Button>
          </div>
        </section>

        {/* YOUR CONNECTIONS */}
        <section className="mt-12 md:mt-16">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{t('screens.commerceportal.connectionsTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('screens.commerceportal.connectionsSubtitle')}</p>
            </div>
            {rows !== null && rows.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {t('screens.commerceportal.connectionsCount', { count: rows.length })}
              </span>
            )}
          </div>

          <div className="mt-4">
            {rows === null ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
                <p className="text-sm text-muted-foreground">{t('screens.commerceportal.empty')}</p>
                <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
                  {t('screens.commerceportal.connectionsEmptyHint')}
                </p>
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {rows.map((row) => (
                  <li key={row.id}>
                    <ConnectionCard row={row} onOpen={openConnection} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {!hasOrgs && orgsSection}

      <p className="mt-8 text-center text-xs text-muted-foreground">{t('screens.commerceportal.footNote')}</p>

      <ManualConnectDialog open={manualOpen} onOpenChange={setManualOpen} onCreated={load} />

      <AddProductSheet open={addProductOpen} onOpenChange={setAddProductOpen} onSaved={load} />

      <RegisterOrgDialog open={registerOrgOpen} onOpenChange={setRegisterOrgOpen} onCreated={onOrgRegistered} />

      {openConnectionId && (
        <ConnectionWorkbench
          key={openConnectionId}
          connectionId={openConnectionId}
          onClose={closeConnection}
          onChanged={load}
        />
      )}

      {openOrgId && (
        <PartnerOrgRoster
          key={openOrgId}
          orgId={openOrgId}
          orgName={myOrgs?.find((o) => o.id === openOrgId)?.display_name}
          onClose={closeOrgRoster}
        />
      )}
    </CommerceShell>
  );
}
