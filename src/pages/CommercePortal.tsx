/**
 * Vitanaland Commerce — the whole merchant portal on one screen (VTID-03882).
 *
 * Replaces `CommerceLanding`, `CommerceConnections` and `CommerceAgentConnect`,
 * and absorbs `CommerceConnectionDetail` as a drawer. A merchant used to walk
 * four URLs to do one thing, and the one genuinely remarkable part — point your
 * own AI at Vitanaland — sat on the third of them, styled as documentation.
 *
 * Order is the argument: the agent card first (this is what the product is),
 * then what happens after, then your connections, then — quietly — the manual
 * form for anyone who would rather type it themselves.
 *
 * Data layer unchanged: plain useState + `adminFetch` against the owner-scoped
 * `/api/v1/vcaop/portal/my` surface. These screens never used React Query and
 * swapping state libraries is not what this change is about.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Building2, ChevronRight, FlaskConical, Loader2, PackagePlus, ShieldCheck, Store, Workflow } from 'lucide-react';
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

  const fade = reduce
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: 'easeOut' as const } };

  // VTID-03989: a returning business user wants their organization, not the
  // merchant pitch — hoist this section above the agent card once they belong
  // to one. A first-time visitor still gets the pitch first.
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
            className="border-amber-500/40 bg-transparent text-amber-600 hover:bg-amber-500/10 dark:text-amber-300"
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
            className="group mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-amber-500/40 hover:bg-card"
          >
            <FlaskConical className="h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{t('screens.commerceportal.healthOrders.sectionTitle')}</p>
              <p className="truncate text-xs text-muted-foreground">{t('screens.commerceportal.healthOrders.sectionSubtitle')}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-amber-500 rtl:rotate-180" />
          </Link>
        )}
      </section>
    </>
  );

  return (
    <CommerceShell>
      {/* HERO */}
      <motion.section {...fade} className="pt-6 text-center lg:pt-16">
        <h1 className="mx-auto max-w-3xl text-2xl font-semibold leading-tight text-foreground lg:text-5xl">
          {t('screens.commerceportal.heroTitle')}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:mt-4 md:text-base">
          {t('screens.commerceportal.heroSubtitle')}
        </p>
      </motion.section>

      {hasOrgs && orgsSection}

      {/* VTID-03999: the merchant-integration pitch, steps, VCAOP connections and
          manual fallback are desktop-portal surfaces (`ConnectionWorkbench`,
          `AgentConnectCard` keep the dark skin). In the phone app the page is
          the business overview: hero + your organizations. `lg:` matches
          useIsMobile's 1024px breakpoint, not Tailwind's md. */}
      <div className="hidden lg:block">
      <motion.section
        {...(reduce ? {} : { ...fade, transition: { duration: 0.5, delay: 0.1, ease: 'easeOut' as const } })}
        className="mt-8 md:mt-10"
      >
        <AgentConnectCard />
      </motion.section>

      {/* WHAT HAPPENS NEXT */}
      <section className="mt-12 md:mt-16">
        <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t('screens.commerceportal.howItWorksTitle')}
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li
              key={title}
              className="relative rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-600 dark:text-amber-300">
                  {i + 1}
                </span>
                <Icon className="h-4 w-4 text-amber-500 dark:text-amber-400/70" />
              </div>
              <h3 className="mt-3 font-medium text-foreground">{t(title)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(body)}</p>
            </li>
          ))}
        </ol>
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

      {!hasOrgs && orgsSection}

      {/* MANUAL FALLBACK — quiet on purpose, but it is the path that works today. */}
      <section className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-border bg-card px-4 py-4 text-center">
        <span className="text-sm text-muted-foreground">{t('screens.commerceportal.manualIntro')}</span>
        <Button
          onClick={() => setAddProductOpen(true)}
          className="bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
        >
          <PackagePlus className="me-2 h-4 w-4" />
          {t('screens.commerceportal.addProduct')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setManualOpen(true)}
          className="h-auto px-2 py-1 text-sm font-medium text-muted-foreground underline-offset-4 hover:bg-transparent hover:text-foreground hover:underline"
        >
          {t('screens.commerceportal.manualCta')}
        </Button>
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">{t('screens.commerceportal.footNote')}</p>
      </div>

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
