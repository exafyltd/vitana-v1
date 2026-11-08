/**
 * VTID-05645 (native-wave2-sharing-business-r3/business-hub) — native port of the mobile web Business
 * Hub (`src/pages/BusinessHub.tsx`, the `useIsMobile()` branch; route `/business` and its nested
 * `services`, `clients`, `sell-earn` and `analytics` paths). One screen: the `MobileModePill`
 * drives the tabs, and `?tab=<leaf>` deep-links any sub-tab (mirroring `resolveMobileTab`). The tab
 * a route opens on is `initialTab`, derived by the route file from its path and `tab` param.
 *
 * Not ported (web dialogs/popups that other lanes' surfaces own; the buttons lead to the nearest
 * native or web destination instead): the create-event / create-meetup / create-service popups, the
 * campaign dialog, the Autopilot popup, the Vitana-index chip, the expandable search (it only logs
 * on web) and the calendar button. React 19: typed with `ReactElement`.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { MobileModePill } from '../../shell/components/MobileModePill';
import { LoadingRows, Surface } from './components';
import { EarningPortal, EarningsLedger, KpiStrip, PartnerCard } from './SnapshotPanel';
import { ClientsPanel, InsightPane, OrganizerEvents, PackagesPanel, ServicesEmpty } from './ServicesPanels';
import { CampaignsPanel, DraftsStrip, InventoryPanel, ReferralsPanel } from './SalesPanels';
import { buildBusinessModes, type BusinessTab } from './tabs';
import { useIsReseller, useUnifiedEarnings } from './data/queries';

export function BusinessHubScreen({ initialTab = 'snapshot' }: { initialTab?: BusinessTab }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { isReseller } = useIsReseller();
  const { earnings, isLoading: earningsLoading } = useUnifiedEarnings();
  const [tab, setTab] = useState<string>(initialTab);
  const [typeOpen, setTypeOpen] = useState(false);

  // A new deep link (route change or `?tab=` change) moves the pill; in-screen pill taps do not touch the URL.
  useEffect(() => setTab(initialTab), [initialTab]);

  const typeOptions = [
    { key: 'event', title: t('business.typeSelector.createEvent'), body: t('business.typeSelector.createEventDesc'), to: '/comm/events' },
    { key: 'service', title: t('business.typeSelector.offerService'), body: t('business.typeSelector.offerServiceDesc'), to: '/commerce' },
    { key: 'reseller', title: t('business.typeSelector.sellTickets'), body: t('business.typeSelector.sellTicketsDesc'), to: '/business/sell-earn' },
  ];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page} testID="screen-business-hub" keyboardShouldPersistTaps="handled">
      <View>
        <Text variant="title" accessibilityRole="header">
          {t('businessHub.title')}
        </Text>
        <Text muted>{t('businessHub.description')}</Text>
      </View>

      <View style={styles.bar}>
        <MobileModePill modes={buildBusinessModes(t, isReseller)} activeMode={tab} title={t('businessNative.selectMode')} onModeChange={setTab} />
        <Button size="sm" onPress={() => setTypeOpen(true)} testID="business-create">
          {t('buttons.create')}
        </Button>
      </View>

      <View style={styles.content} testID={`business-tab-${tab}`}>
        {tab === 'snapshot' ? (
          <View style={styles.content}>
            <KpiStrip earnings={earnings} />
            <EarningPortal onAddToInventory={() => setTab('sales.inventory')} />
            <PartnerCard />
            <View style={styles.content}>
              <Text weight="600" muted>
                {t('businessHub.recentActivity')}
              </Text>
              {earningsLoading ? <LoadingRows testID="ledger-loading" count={2} /> : <EarningsLedger rows={earnings.recentTransactions} />}
            </View>
          </View>
        ) : null}
        {tab === 'services.services' ? <ServicesEmpty /> : null}
        {tab === 'services.events' ? <OrganizerEvents /> : null}
        {tab === 'services.packages' ? <PackagesPanel /> : null}
        {tab.startsWith('sales.') ? <DraftsStrip /> : null}
        {tab === 'sales.inventory' ? <InventoryPanel /> : null}
        {tab === 'sales.promotions' ? <CampaignsPanel /> : null}
        {tab === 'sales.referrals' ? <ReferralsPanel /> : null}
        {tab === 'insights.clients' ? <ClientsPanel /> : null}
        {tab === 'insights.performance' ? <InsightPane kind="performance" /> : null}
        {tab === 'insights.earnings' ? <InsightPane kind="earnings" /> : null}
        {tab === 'insights.growth' ? <InsightPane kind="growth" /> : null}
      </View>

      <BottomSheet open={typeOpen} onClose={() => setTypeOpen(false)} title={t('business.typeSelector.title')} testID="business-type-sheet">
        {typeOptions.map((o) => (
          <Surface
            key={o.key}
            testID={`business-type-${o.key}`}
            accessibilityLabel={o.title}
            onPress={() => {
              setTypeOpen(false);
              navigateToWebPath(o.to);
            }}
          >
            <Text weight="600">{o.title}</Text>
            <Text variant="caption" muted>
              {o.body}
            </Text>
          </Surface>
        ))}
        <Button variant="ghost" onPress={() => setTypeOpen(false)}>
          {t('business.typeSelector.cancel')}
        </Button>
      </BottomSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  content: { gap: 12 },
});
