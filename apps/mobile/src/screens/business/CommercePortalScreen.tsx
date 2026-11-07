/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — `/commerce`, the native
 * twin of src/pages/CommercePortal.tsx, mobile-web branch (CommerceShell's
 * in-app skin: the app's own chrome + `mx-auto max-w-5xl px-4 pb-24`; the
 * business bottom bar comes from the shell, business-mode.ts).
 *
 * Guest (App.tsx `<AuthGuard allowGuest>`): the guest hero with one sign-up
 * CTA → `/commerce/join?redirectTo=/commerce`, the story landing
 * (CommerceGuestLanding + "What happens next"), the foot note.
 *
 * Signed in: the hero (headline personalised by first name / first org; the
 * two real CTAs in the web's order: MCP connect first once the gateway serves
 * it, else "Set up with AI" once switched on, else register first), "Get
 * ready to sell" (SetupHub) for the active admin business, "Your
 * organizations" (hoisted above the rest once you belong to one — the
 * VTID-03989 order), the CSV-import entry and the health-orders link, the foot
 * note. The desktop-only block (`hidden lg:block`: agent card, manual card,
 * connections list) is not rendered on the phone — exactly the mobile web.
 * Every sheet the web mounts is here: register, set up with AI, setup
 * chooser, add product, sales setup, manual connect, CSV import, the MCP
 * panel, the agent card ("Connect via AI Agent" opens it in a dialog below
 * lg:), the connection workbench (`?connection=`) and the org roster
 * (`?org=`), both deep-linkable through the route's search params.
 *
 * First visit with no business: once the gateway flags are known the
 * matching sheet opens by itself, once per app session (the web's
 * sessionStorage key). A voice draft from Vitana (`vitana:commerce-setup-draft`
 * on the native overlay bus) opens the AI review card.
 */
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, PressableRow, Text, notifyError, useUITheme } from '../../ports/ui';
import { BizIcon, FadeIn, ResponsiveDialog, ResponsiveDialogBody, ResponsiveDialogContent, type BizGlyph } from '../../ports/business-ui';
import {
  MY_PORTAL_API,
  PARTNER_ORGS_API,
  VOICE_SETUP_EVENTS,
  draftFromVoiceEvent,
  fetchAiSetupEnabled,
  type ConnectionRow,
  type MyOrgRow,
  type SetupDraft,
  type SetupOption,
} from '../../ports/commerce';
import { pickActiveOrg } from '../../ports/core';
import { useAuth } from '../../auth/AuthProvider';
import { getSupabase } from '../../auth/client';
import { activeOrgStore, hydrateActiveOrg } from '../../identity/device-storage';
import { useBusEvent } from '../../navigation/overlay-bus';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { commerceFetch, fetchMcpReady } from './data/client';
import { AgentConnectCard, McpConnectPanel } from './components/AgentConnect';
import { MyOrgCard } from './components/Cards';
import { CommerceGuestLanding } from './components/GuestLanding';
import { RegisterOrgDialog } from './components/RegisterOrgDialog';
import { SetupHub } from './components/SetupHub';
import { SetupChooser } from './components/SetupChooser';
import { SalesSetupSheet } from './components/SalesSetupSheet';
import { AiSetupSheet } from './components/AiSetupSheet';
import { AddProductSheet } from './components/AddProductSheet';
import { CatalogueImportSheet } from './components/CatalogueImportSheet';
import { ManualConnectDialog } from './components/ManualConnectDialog';
import { ConnectionWorkbench } from './components/ConnectionWorkbench';
import { PartnerOrgRoster } from './components/PartnerOrgRoster';
import { CollectionSkeleton } from './components/parts';

/** The web's `sessionStorage['vitana.commerce.autoRegisterShown']`: once per app session. */
let autoRegisterShown = false;
export function __resetAutoRegisterForTests(): void {
  autoRegisterShown = false;
}

const firstParam = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || null;
const JOIN_HREF = `/commerce/join?redirectTo=${encodeURIComponent('/commerce')}`;

/** ProfileProvider's display name (first + last, else display_name / full_name / e-mail), first word only. */
function useFirstName(): string {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ['commerce', 'profile-name', user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await getSupabase().from('profiles').select('first_name, last_name, display_name, full_name').eq('user_id', user?.id as string).maybeSingle();
      return (data ?? null) as { first_name?: string | null; last_name?: string | null; display_name?: string | null; full_name?: string | null } | null;
    },
  });
  if (!user || !q.data) return '';
  const composed = [q.data.first_name, q.data.last_name].filter(Boolean).join(' ').trim();
  const name = composed || q.data.display_name || q.data.full_name || user.email?.split('@')[0] || '';
  return name.trim().split(/\s+/)[0] || '';
}

function HeroButton({ label, icon, onPress, primary, testID }: { label: string; icon: BizGlyph; onPress: () => void; primary: boolean; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <Button size="lg" variant={primary ? 'default' : 'outline'} onPress={onPress} testID={testID} style={styles.heroButton}>
      <BizIcon name={icon} size={16} color={primary ? colors.primaryForeground : colors.primary} />
      {label}
    </Button>
  );
}

export function CommercePortalScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const firstName = useFirstName();
  const params = useLocalSearchParams<{ connection?: string | string[]; org?: string | string[] }>();
  const openConnectionId = firstParam(params.connection);
  const openOrgId = firstParam(params.org);

  // The connections list is desktop-only (`hidden lg:block`); the web still loads it, and reloads after a connect.
  const [, setRows] = useState<ConnectionRow[] | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [registerOrgOpen, setRegisterOrgOpen] = useState(false);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [aiSetupOpen, setAiSetupOpen] = useState(false);
  const [mcpReady, setMcpReady] = useState<boolean | null>(null);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState<SetupDraft | null>(null);
  const [catalogueImportOpen, setCatalogueImportOpen] = useState(false);
  const [myOrgs, setMyOrgs] = useState<MyOrgRow[] | null>(null);
  const [myOrgsFailed, setMyOrgsFailed] = useState(false);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const adminOrgs = (myOrgs ?? []).filter((o) => o.role === 'org_admin');
  const [hubOrgId, setHubOrgId] = useState<string | null>(() => activeOrgStore.getSnapshot());
  const [hubRefresh, setHubRefresh] = useState(0);
  const hubOrg = pickActiveOrg(adminOrgs, hubOrgId);

  useEffect(() => {
    void hydrateActiveOrg().then(() => setHubOrgId((cur) => cur ?? activeOrgStore.getSnapshot()));
  }, []);

  const selectHubOrg = (id: string) => {
    activeOrgStore.set(id);
    setHubOrgId(id);
  };

  const load = useCallback(async () => {
    try {
      const res = await commerceFetch(`${MY_PORTAL_API}/connections`);
      setRows(res.data ?? []);
    } catch {
      setRows([]);
      notifyError('screens.partnerportal.loadFailed');
    }
  }, []);

  const loadMyOrgs = useCallback(async () => {
    try {
      const res = await commerceFetch(`${PARTNER_ORGS_API}/mine`);
      setMyOrgs(res.organizations ?? []);
      setMyOrgsFailed(false);
    } catch {
      setMyOrgs([]);
      setMyOrgsFailed(true);
      notifyError('screens.commerceportal.orgOnboarding.orgsLoadFailed');
    }
  }, []);
  const loadMyOrgsRef = useRef(loadMyOrgs);
  loadMyOrgsRef.current = loadMyOrgs;

  const onOrgRegistered = useCallback(async (org: MyOrgRow | null) => {
    await loadMyOrgsRef.current();
    if (org) {
      activeOrgStore.set(org.id);
      setHubOrgId(org.id);
    }
  }, []);

  // A signed-in user with no business yet goes straight into registering one, once per session.
  useEffect(() => {
    if (!user || myOrgs === null || myOrgsFailed || myOrgs.length > 0 || aiReady === null || mcpReady === null) return;
    if (autoRegisterShown) return;
    autoRegisterShown = true;
    if (mcpReady) setMcpOpen(true);
    else if (aiReady) setAiSetupOpen(true);
    else setRegisterOrgOpen(true);
  }, [user, myOrgs, myOrgsFailed, aiReady, mcpReady]);

  useEffect(() => {
    if (!user) return;
    void load();
    void loadMyOrgs();
    void fetchAiSetupEnabled(commerceFetch).then(setAiReady);
    void fetchMcpReady().then(setMcpReady);
  }, [user, load, loadMyOrgs]);

  // The pre-login landing explains the one-step connection only once the gateway serves it.
  useEffect(() => {
    if (user) return;
    void fetchMcpReady().then(setMcpReady);
  }, [user]);

  useBusEvent(
    VOICE_SETUP_EVENTS.draft,
    (detail) => {
      const draft = draftFromVoiceEvent(detail);
      if (!draft) return;
      setVoiceDraft(draft);
      setAiSetupOpen(true);
    },
    !!user && aiReady === true,
  );

  const openOrgRoster = (id: string) => router.setParams({ org: id } as never);
  const closeOrgRoster = () => router.setParams({ org: undefined } as never);
  const closeConnection = () => router.setParams({ connection: undefined } as never);

  // Below lg the agent card is not on screen, so "Connect via AI Agent" opens it in a dialog.
  const connectViaAgent = () => setAgentDialogOpen(true);

  const chooseSetup = (option: SetupOption) => {
    if (option === 'ai') {
      if (mcpReady) setMcpOpen(true);
      else if (aiReady) setAiSetupOpen(true);
      else connectViaAgent();
    } else if (option === 'manual') setAddProductOpen(true);
    else setManualOpen(true);
  };

  const hasOrgs = (myOrgs?.length ?? 0) > 0;
  const heroHeadline =
    user && hasOrgs && myOrgs
      ? t('screens.commerceportal.heroTitlePersonalizedWithOrg', { name: firstName, orgName: myOrgs[0].display_name })
      : user && firstName
        ? t('screens.commerceportal.heroTitlePersonalizedNoOrg', { name: firstName })
        : t('screens.commerceportal.heroTitle');
  const join = () => navigateToWebPath(JOIN_HREF);

  const orgsSection = (
    <View style={styles.orgs} testID="commerce-orgs">
      <View style={styles.sectionHead}>
        <View style={styles.fill}>
          <Text size="xl" weight="600">
            {t('screens.commerceportal.orgOnboarding.sectionTitle')}
          </Text>
          <Text size="sm" muted>
            {t('screens.commerceportal.orgOnboarding.sectionSubtitle')}
          </Text>
        </View>
        <Button variant="outline" onPress={() => setRegisterOrgOpen(true)} testID="orgs-register">
          <BizIcon name="Building2" size={16} color={colors.primary} />
          {t('screens.commerceportal.orgOnboarding.registerCta')}
        </Button>
      </View>
      {myOrgs === null ? (
        <CollectionSkeleton testID="orgs-loading" label={t('common.loading')} />
      ) : myOrgs.length === 0 ? (
        <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]} testID="orgs-empty">
          <Text size="sm" muted style={styles.center}>
            {t('screens.commerceportal.orgOnboarding.orgsEmpty')}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {myOrgs.map((org) => (
            <MyOrgCard key={org.id} org={org} onManage={openOrgRoster} />
          ))}
        </View>
      )}
      {adminOrgs.length > 0 ? (
        <PressableRow onPress={() => setCatalogueImportOpen(true)} testID="orgs-catalogue-import" accessibilityLabel={t('screens.commerceportal.catalogueImport.entryTitle')} style={[styles.entry, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <BizIcon name="FileUp" size={20} color={colors.primary} />
          <View style={styles.fill}>
            <Text weight="500">{t('screens.commerceportal.catalogueImport.entryTitle')}</Text>
            <Text size="xs" muted numberOfLines={1}>
              {t('screens.commerceportal.catalogueImport.entrySubtitle')}
            </Text>
          </View>
          <BizIcon name="ChevronRight" size={16} color={colors.mutedForeground} flip />
        </PressableRow>
      ) : null}
      {myOrgs !== null && myOrgs.length > 0 ? (
        <PressableRow onPress={() => navigateToWebPath('/commerce/health-orders')} accessibilityRole="link" testID="orgs-health-orders" accessibilityLabel={t('screens.commerceportal.healthOrders.sectionTitle')} style={[styles.entry, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <BizIcon name="FlaskConical" size={20} color={colors.primary} />
          <View style={styles.fill}>
            <Text weight="500">{t('screens.commerceportal.healthOrders.sectionTitle')}</Text>
            <Text size="xs" muted numberOfLines={1}>
              {t('screens.commerceportal.healthOrders.sectionSubtitle')}
            </Text>
          </View>
          <BizIcon name="ChevronRight" size={16} color={colors.mutedForeground} flip />
        </PressableRow>
      ) : null}
    </View>
  );

  const heroButtons = mcpReady ? (
    <>
      <HeroButton primary icon="Sparkles" label={t('screens.commerceportal.mcpConnect.cta')} onPress={() => setMcpOpen(true)} testID="hero-ai" />
      <HeroButton primary={false} icon="Building2" label={t('screens.commerceportal.mcpConnect.manualCta')} onPress={() => setRegisterOrgOpen(true)} testID="hero-manual" />
    </>
  ) : aiReady ? (
    <>
      <HeroButton primary icon="Sparkles" label={t('screens.commerceportal.aiSetup.cta')} onPress={() => setAiSetupOpen(true)} testID="hero-ai" />
      <HeroButton primary={false} icon="Building2" label={t('screens.commerceportal.aiSetup.manualCta')} onPress={() => setRegisterOrgOpen(true)} testID="hero-register" />
    </>
  ) : (
    <>
      <HeroButton primary={!hasOrgs} icon="Building2" label={t('screens.commerceportal.orgOnboarding.registerCta')} onPress={() => setRegisterOrgOpen(true)} testID="hero-register" />
      <HeroButton primary={false} icon="Sparkles" label={t('screens.commerceportal.agentConnect.title')} onPress={connectViaAgent} testID="hero-ai" />
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="screen-commerce">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="commerce-scroll">
        <FadeIn style={styles.hero} testID="commerce-hero">
          {!user ? (
            <View style={styles.heroInner} testID="commerce-guest-hero">
              <Text size="2xl" weight="700" style={styles.center} accessibilityRole="header">
                {t('screens.commerceportal.guest.heroTitle')}
              </Text>
              <Text size="lg" style={styles.center}>
                {t('screens.commerceportal.guest.heroSubtitle')}
              </Text>
              {mcpReady ? (
                <Text weight="600" color={colors.primary} style={styles.center} testID="guest-tagline">
                  {t('screens.commerceportal.guest.heroTagline')}
                </Text>
              ) : null}
              <Button size="lg" onPress={join} testID="guest-join" style={styles.heroButton}>
                {mcpReady ? t('screens.commerceportal.mcpConnect.cta') : t('screens.commerceportal.guestCta')}
              </Button>
              <Text size="xs" muted style={styles.center}>
                {t('screens.commerceportal.guestCtaHint')}
              </Text>
            </View>
          ) : (
            <View style={styles.heroInner} testID="commerce-member-hero">
              <Text size="2xl" weight="600" style={styles.center} accessibilityRole="header" testID="commerce-headline">
                {heroHeadline}
              </Text>
              <Text size="sm" muted style={styles.center}>
                {t('screens.commerceportal.heroSubtitle')}
              </Text>
              <View style={styles.heroButtons}>{heroButtons}</View>
            </View>
          )}
        </FadeIn>

        {user && hubOrg ? <SetupHub orgs={adminOrgs} activeOrgId={hubOrg.id} onSelectOrg={selectHubOrg} onAddProducts={() => setChooserOpen(true)} onSalesSetup={() => setSalesOpen(true)} refreshKey={hubRefresh} /> : null}

        {user && hasOrgs ? orgsSection : null}

        {!user ? <CommerceGuestLanding mcpReady={mcpReady === true} onJoin={join} /> : null}

        {user && !hasOrgs ? orgsSection : null}

        <Text size="xs" muted style={[styles.center, styles.footNote]}>
          {t('screens.commerceportal.footNote')}
        </Text>
      </ScrollView>

      <ManualConnectDialog open={manualOpen} onOpenChange={setManualOpen} onCreated={load} org={hubOrg} orgs={adminOrgs} onSelectOrg={selectHubOrg} />
      <AddProductSheet
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        onSaved={async () => {
          await load();
          setHubRefresh((n) => n + 1);
        }}
        orgs={adminOrgs}
        activeOrgId={hubOrg?.id ?? null}
        onSelectOrg={selectHubOrg}
        onImportFile={() => setCatalogueImportOpen(true)}
        onRegister={() => setRegisterOrgOpen(true)}
      />
      <SetupChooser open={chooserOpen} onOpenChange={setChooserOpen} onChoose={chooseSetup} aiReady={aiReady === true} org={hubOrg} orgs={adminOrgs} onSelectOrg={selectHubOrg} />
      <SalesSetupSheet open={salesOpen} onOpenChange={setSalesOpen} org={hubOrg} onSaved={() => setHubRefresh((n) => n + 1)} />
      <RegisterOrgDialog open={registerOrgOpen} onOpenChange={setRegisterOrgOpen} onCreated={onOrgRegistered} />
      <AiSetupSheet
        open={aiSetupOpen}
        onOpenChange={(next) => {
          setAiSetupOpen(next);
          if (!next) setVoiceDraft(null);
        }}
        initialDraft={voiceDraft}
        org={hubOrg}
        orgs={adminOrgs}
        onSelectOrg={selectHubOrg}
        onPreferManual={() => (hubOrg ? setAddProductOpen(true) : setRegisterOrgOpen(true))}
        onDone={async (outcome) => {
          await onOrgRegistered({ id: outcome.organization.id } as MyOrgRow);
          setHubRefresh((n) => n + 1);
        }}
      />
      <CatalogueImportSheet open={catalogueImportOpen} onOpenChange={setCatalogueImportOpen} adminOrgs={adminOrgs} />
      <ResponsiveDialog open={mcpOpen} onOpenChange={setMcpOpen}>
        <ResponsiveDialogContent testID="mcp-dialog">
          <ResponsiveDialogBody>
            <McpConnectPanel
              onRegisterManually={() => {
                setMcpOpen(false);
                setRegisterOrgOpen(true);
              }}
            />
          </ResponsiveDialogBody>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      <ResponsiveDialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
        <ResponsiveDialogContent testID="agent-dialog">
          <ResponsiveDialogBody>
            <AgentConnectCard />
          </ResponsiveDialogBody>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      {openConnectionId ? <ConnectionWorkbench key={openConnectionId} connectionId={openConnectionId} onClose={closeConnection} onChanged={load} /> : null}
      {openOrgId ? <PartnerOrgRoster key={openOrgId} orgId={openOrgId} orgName={myOrgs?.find((o) => o.id === openOrgId)?.display_name} onClose={closeOrgRoster} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 96 },
  hero: { paddingTop: 24 },
  heroInner: { gap: 12, alignItems: 'stretch' },
  heroButtons: { gap: 12, marginTop: 16 },
  heroButton: { minHeight: 48, borderRadius: 12, alignSelf: 'stretch', gap: 8 },
  center: { textAlign: 'center' },
  orgs: { marginTop: 48, gap: 16 },
  sectionHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  fill: { flex: 1, minWidth: 0 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 40 },
  list: { gap: 12 },
  entry: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  footNote: { marginTop: 32 },
});
