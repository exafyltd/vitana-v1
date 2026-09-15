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
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Building2, Loader2, PackagePlus, ShieldCheck, Store, Workflow } from 'lucide-react';
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

  return (
    <CommerceShell>
      {/* HERO */}
      <motion.section {...fade} className="pt-10 text-center md:pt-16">
        <h1 className="mx-auto max-w-3xl text-3xl font-semibold leading-tight text-slate-50 md:text-5xl">
          {t('screens.commerceportal.heroTitle')}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 md:mt-4 md:text-base">
          {t('screens.commerceportal.heroSubtitle')}
        </p>
      </motion.section>

      <motion.section
        {...(reduce ? {} : { ...fade, transition: { duration: 0.5, delay: 0.1, ease: 'easeOut' as const } })}
        className="mt-8 md:mt-10"
      >
        <AgentConnectCard />
      </motion.section>

      {/* WHAT HAPPENS NEXT */}
      <section className="mt-12 md:mt-16">
        <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          {t('screens.commerceportal.howItWorksTitle')}
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li
              key={title}
              className="relative rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-300">
                  {i + 1}
                </span>
                <Icon className="h-4 w-4 text-amber-400/70" />
              </div>
              <h3 className="mt-3 font-medium text-slate-100">{t(title)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{t(body)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* YOUR CONNECTIONS */}
      <section className="mt-12 md:mt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">{t('screens.commerceportal.connectionsTitle')}</h2>
            <p className="text-sm text-slate-500">{t('screens.commerceportal.connectionsSubtitle')}</p>
          </div>
          {rows !== null && rows.length > 0 && (
            <span className="text-xs text-slate-500">
              {t('screens.commerceportal.connectionsCount', { count: rows.length })}
            </span>
          )}
        </div>

        <div className="mt-4">
          {rows === null ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-5 py-10 text-center">
              <p className="text-sm text-slate-300">{t('screens.commerceportal.empty')}</p>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">
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

      {/* YOUR ORGANIZATIONS — Commerce Partner Onboarding (VTID-03936) */}
      <section className="mt-12 md:mt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">
              {t('screens.commerceportal.orgOnboarding.sectionTitle')}
            </h2>
            <p className="text-sm text-slate-500">{t('screens.commerceportal.orgOnboarding.sectionSubtitle')}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setRegisterOrgOpen(true)}
            className="border-amber-500/40 bg-transparent text-amber-300 hover:bg-amber-500/10"
          >
            <Building2 className="me-2 h-4 w-4" />
            {t('screens.commerceportal.orgOnboarding.registerCta')}
          </Button>
        </div>

        <div className="mt-4">
          {myOrgs === null ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            </div>
          ) : myOrgs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-5 py-10 text-center">
              <p className="text-sm text-slate-300">{t('screens.commerceportal.orgOnboarding.orgsEmpty')}</p>
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
      </section>

      {/* MANUAL FALLBACK — quiet on purpose, but it is the path that works today. */}
      <section className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-slate-800/70 bg-slate-900/30 px-4 py-4 text-center">
        <span className="text-sm text-slate-500">{t('screens.commerceportal.manualIntro')}</span>
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
          className="h-auto px-2 py-1 text-sm font-medium text-slate-400 underline-offset-4 hover:bg-transparent hover:text-slate-200 hover:underline"
        >
          {t('screens.commerceportal.manualCta')}
        </Button>
      </section>

      <p className="mt-8 text-center text-xs text-slate-600">{t('screens.commerceportal.footNote')}</p>

      <ManualConnectDialog open={manualOpen} onOpenChange={setManualOpen} onCreated={load} />

      <AddProductSheet open={addProductOpen} onOpenChange={setAddProductOpen} onSaved={load} />

      <RegisterOrgDialog open={registerOrgOpen} onOpenChange={setRegisterOrgOpen} onCreated={loadMyOrgs} />

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
