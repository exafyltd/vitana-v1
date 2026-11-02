/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — `/connectors`, the
 * native twin of the mobile-web Connected Apps view
 * (`src/pages/settings/ConnectedApps.tsx` → `MobileConnectedAppsView.tsx`).
 * One file serves the nine `/connectors` ledger rows: the `tab` search param
 * selects a category pill (all, shopping, ai, productivity, media, social,
 * fitness, health, other, agent — the web's `CONNECTOR_TABS`; any other value
 * keeps "all"). The pill writes the param back with `router.setParams`.
 *
 * Live state, read from the gateway as the web reads it: wearable providers
 * (fitness / health connected only when the gateway says so), AI providers,
 * the Google / YouTube social connections, the mail / calendar / contacts hub
 * and the Autopilot channels. Connect for a Google or YouTube connector GETs
 * the gateway OAuth start and hands the consent URL to `openConsentUrl`
 * (support port); the return leg is the G1 device pass. Tests mock the gateway
 * and the opener: no test opens a URL or writes anywhere.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Text, TextInput, notify, notifyError, useUITheme } from '../../ports/ui';
import { openConsentUrl } from '../../ports/support';
import { getSupabase } from '../../auth/client';
import { GatewayError } from '../../ports/core';
import { MobileModePill, type ModeOption } from '../../shell/components/MobileModePill';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { ScreenScaffold } from './components';
import { formatDateTime } from './format';
import { ConnectionSummary, IntegrationDetailSheet, IntegrationSection, useIntegrationText } from './IntegrationSection';
import { MailHubSection } from './MailHubSection';
import { AgentChannelsPanel } from './AgentChannelsPanel';
import {
  GOOGLE_CONNECTOR_IDS,
  YOUTUBE_CONNECTOR_IDS,
  aiAssistantsIntegrations,
  fitnessIntegrations,
  getAllIntegrations,
  getConnectionStats,
  healthIntegrations,
  mediaIntegrations,
  mergeWearableState,
  otherIntegrations,
  productivityIntegrations,
  shoppingIntegrations,
  socialIntegrations,
  startSocialOAuth,
  useAIProviders,
  useSocialConnections,
  useWearableProviders,
  type Integration,
} from './data/connectors';

/** Web `CONNECTOR_TABS` (MobileConnectedAppsView.tsx). */
export const CONNECTOR_TABS = ['all', 'shopping', 'ai', 'productivity', 'media', 'social', 'fitness', 'health', 'other', 'agent'] as const;
export type ConnectorTab = (typeof CONNECTOR_TABS)[number];

export function connectorTab(value: string | null | undefined): ConnectorTab | null {
  return value && (CONNECTOR_TABS as readonly string[]).includes(value) ? (value as ConnectorTab) : null;
}

const MODES = 'supportNative.connectors.modes';
const SECTIONS = 'supportNative.connectors.sections';

export function ConnectorsScreen(): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const text = useIntegrationText();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [active, setActive] = useState<ConnectorTab>(() => connectorTab(params.tab) ?? 'all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Integration | null>(null);

  // Only an explicit valid `?tab=` moves the pill (web VTID-NAV-CONNECTORS-TABS).
  useEffect(() => {
    const next = connectorTab(params.tab);
    if (next) setActive(next);
  }, [params.tab]);

  const changeTab = (value: string) => {
    const next = connectorTab(value) ?? 'all';
    setActive(next);
    router.setParams({ tab: next });
  };

  const modes: ModeOption[] = [
    { value: 'all', label: t(`${MODES}.all`), icon: '🔌' },
    { value: 'shopping', label: t(`${MODES}.shopping`), icon: '🛍' },
    { value: 'ai', label: t(`${MODES}.ai`), icon: '✨' },
    { value: 'productivity', label: t(`${MODES}.productivity`), icon: '📅' },
    { value: 'media', label: t(`${MODES}.media`), icon: '🎵' },
    { value: 'social', label: t('connectedApps.sections.social'), icon: '📱' },
    { value: 'fitness', label: t('connectedApps.sections.fitness'), icon: '💪' },
    { value: 'health', label: t('connectedApps.sections.health'), icon: '🏥' },
    { value: 'other', label: t('connectedApps.sections.other'), icon: '🔧' },
    { value: 'agent', label: t(`${MODES}.agent`), icon: '📡' },
  ];

  const ai = useAIProviders();
  const social = useSocialConnections();
  const wearables = useWearableProviders();

  const googleConnection = (social.data ?? []).find((c) => c.provider === 'google');
  const youtubeConnection = (social.data ?? []).find((c) => c.provider === 'youtube');
  const fmt = (iso: string) => formatDateTime(iso, locale);

  const fitnessLive = mergeWearableState(fitnessIntegrations, wearables.data, fmt);
  const healthLive = mergeWearableState(healthIntegrations, wearables.data, fmt);
  const { connected, syncing } = getConnectionStats(getAllIntegrations({ fitness: fitnessLive, health: healthLive }));

  const aiLive: Integration[] = aiAssistantsIntegrations.map((base) => {
    const live = (ai.data ?? []).find((p) => p.provider === base.id);
    if (!live) return base;
    return {
      ...base,
      connected: live.status === 'connected',
      comingSoon: live.status === 'disabled',
      lastSync: live.last_verified_at ? fmt(live.last_verified_at) : undefined,
    };
  });

  const withGoogleStatus = (list: Integration[]): Integration[] =>
    list.map((i) => {
      if (GOOGLE_CONNECTOR_IDS.has(i.id) && googleConnection) return { ...i, connected: true, lastSync: fmt(googleConnection.connected_at) };
      if (YOUTUBE_CONNECTOR_IDS.has(i.id) && youtubeConnection) return { ...i, connected: true, lastSync: fmt(youtubeConnection.connected_at) };
      return i;
    });

  const query = search.trim().toLowerCase();
  const filter = (list: Integration[]) =>
    query ? list.filter((i) => text.name(i).toLowerCase().includes(query) || t(i.syncKey).toLowerCase().includes(query)) : list;

  const shopping = filter(shoppingIntegrations);
  const aiList = filter(aiLive);
  const socialList = filter(socialIntegrations);
  const fitness = filter(fitnessLive);
  const health = filter(healthLive);
  const productivity = filter(withGoogleStatus(productivityIntegrations));
  const media = filter(withGoogleStatus(mediaIntegrations));
  const other = filter(otherIntegrations);

  const show = (tab: ConnectorTab) => active === 'all' || active === tab;

  const placeholder = (i: Integration) => notify('connectedApps.actions.connect', 'connectedApps.popup.connectionPlaceholder', { appName: text.name(i) });

  const startOAuth = async (provider: 'google' | 'youtube') => {
    try {
      const url = await startSocialOAuth(provider);
      await openConsentUrl(url);
    } catch {
      notifyError(provider === 'google' ? 'toasts.settings.couldnTStartGoogleSignin' : 'toasts.settings.couldnTStartYoutubeSignin');
    }
  };

  /** Web `handleConnect` (MobileConnectedAppsView.tsx). */
  const handleConnect = (i: Integration) => {
    if (i.category === 'shopping') {
      if (i.comingSoon) return;
      setSelected(null);
      navigateToWebPath('/discover');
      return;
    }
    if (GOOGLE_CONNECTOR_IDS.has(i.id)) {
      if (i.connected || googleConnection) {
        notify('supportNative.connectors.linkedTo', undefined, { app: text.name(i), account: googleConnection?.username ?? googleConnection?.display_name ?? 'Google' });
        return;
      }
      void startOAuth('google');
      return;
    }
    if (YOUTUBE_CONNECTOR_IDS.has(i.id)) {
      if (i.connected || youtubeConnection) {
        notify('supportNative.connectors.linkedTo', undefined, { app: text.name(i), account: youtubeConnection?.username ?? youtubeConnection?.display_name ?? 'YouTube' });
        return;
      }
      void startOAuth('youtube');
      return;
    }
    // AI key paste, DoctorBox consent and the social import dialogs are not
    // ported yet: the generic placeholder the web shows for other apps.
    placeholder(i);
  };

  const handleDisconnect = (i: Integration) =>
    notify('connectedApps.actions.disconnect', 'connectedApps.popup.connectionPlaceholder', { appName: text.name(i) });
  const handleConfigure = (i: Integration) => notify('connectedApps.actions.configure', undefined, { appName: text.name(i) });

  const sessionExpired = social.error instanceof GatewayError && social.error.status === 401;

  const refreshSession = async () => {
    try {
      const { data, error } = await getSupabase().auth.refreshSession();
      if (error || !data.session) {
        navigateToWebPath(`/maxina?tab=signin&next=${encodeURIComponent('/connectors')}`);
        return;
      }
      await queryClient.invalidateQueries();
    } catch {
      navigateToWebPath(`/maxina?tab=signin&next=${encodeURIComponent('/connectors')}`);
    }
  };

  return (
    <ScreenScaffold
      testID="screen-connectors"
      title={t('connectedApps.title')}
      description={t('connectedApps.description')}
      toolbar={
        <>
          <TextInput
            testID="connectors-search"
            value={search}
            onChangeText={setSearch}
            placeholder={t('connectedApps.searchPlaceholder')}
            accessibilityLabel={t('connectedApps.searchPlaceholder')}
            style={styles.search}
          />
          <MobileModePill modes={modes} activeMode={active} onModeChange={changeTab} />
        </>
      }
    >
      {sessionExpired ? (
        <View style={[styles.banner, { borderColor: colors.destructive, backgroundColor: colors.statusErrorSubtle }]} testID="session-expired">
          <Text size="sm" weight="600" color={colors.destructive}>
            {t('screens.settings.yourSessionExpired')}
          </Text>
          <Text size="sm">{t('screens.settings.signAgainSeeYourConnectedApps')}</Text>
          <Button size="sm" variant="outline" onPress={() => void refreshSession()}>
            {t('screens.settings.refreshSession')}
          </Button>
        </View>
      ) : null}

      <ConnectionSummary connected={connected} syncing={syncing} />

      <View style={styles.sections}>
        {show('shopping') && shopping.length > 0 ? (
          <IntegrationSection
            testID="section-shopping"
            title={t(`${SECTIONS}.shopping`)}
            emoji="🛍"
            integrations={shopping}
            onSelect={(i) => (i.comingSoon ? setSelected(i) : navigateToWebPath('/discover'))}
          />
        ) : null}
        {show('ai') && aiList.length > 0 ? (
          <IntegrationSection
            testID="section-ai"
            title={t('screens.settings.aiAssistants')}
            emoji="✨"
            integrations={aiList}
            onSelect={setSelected}
          />
        ) : null}
        {show('productivity') && (!query || productivity.length > 0) ? (
          <MailHubSection key={query ? 'search' : 'browse'} title={t(`${SECTIONS}.productivity`)} defaultExpanded={active === 'productivity' || !!query} />
        ) : null}
        {show('media') && media.length > 0 ? (
          <IntegrationSection
            testID="section-media"
            title={t(`${SECTIONS}.media`)}
            emoji="🎵"
            integrations={media}
            onSelect={setSelected}
          />
        ) : null}
        {show('social') && socialList.length > 0 ? (
          <IntegrationSection
            testID="section-social"
            title={t('connectedApps.sections.social')}
            emoji="📱"
            integrations={socialList}
            onSelect={setSelected}
          />
        ) : null}
        {show('fitness') && fitness.length > 0 ? (
          <IntegrationSection
            testID="section-fitness"
            title={t('connectedApps.sections.fitness')}
            emoji="💪"
            integrations={fitness}
            onSelect={setSelected}
          />
        ) : null}
        {show('health') && health.length > 0 ? (
          <IntegrationSection
            testID="section-health"
            title={t('connectedApps.sections.health')}
            emoji="🩺"
            integrations={health}
            onSelect={setSelected}
          />
        ) : null}
        {show('other') && other.length > 0 ? (
          <IntegrationSection
            testID="section-other"
            title={t('connectedApps.sections.other')}
            emoji="🔧"
            integrations={other}
            onSelect={setSelected}
          />
        ) : null}
        {show('agent') ? <AgentChannelsPanel /> : null}
      </View>

      <IntegrationDetailSheet
        integration={selected}
        onClose={() => setSelected(null)}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onConfigure={handleConfigure}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  search: { flexGrow: 1, minWidth: 140 },
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  sections: { gap: 12 },
});
