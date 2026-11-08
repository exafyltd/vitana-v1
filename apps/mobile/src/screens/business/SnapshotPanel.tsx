/**
 * VTID-05645 (native-wave2-sharing-business-r3/business-hub) — the Snapshot tab of the Business Hub
 * (web `MobileKPIStrip`, `MobileEarningPortal`, `CommercePartnerCard`, `EarningsHistoryLedger`).
 * The four KPI cards link where the web ones do (`/business?tab=history`, `/wallet`); the earning
 * portal is a sheet of four ways to start earning; the partner card is the Commerce on-ramp.
 * Commerce UX contract (VTID-05204): a 1:1 port, one dominant action ("Start earning"), no field
 * or step added.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Icon, Text } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { useMyPartnerOrgs } from '../../identity/useMyPartnerOrgs';
import { EmptyState, FilterChips, Surface } from './components';
import { filterLedger, formatMoney, type EarningsTransaction, type LedgerFilter, type UnifiedEarnings } from './earnings';
import { formatDay } from './format';

export function KpiStrip({ earnings }: { earnings: UnifiedEarnings }) {
  const { t, locale } = useI18n();
  const cards = [
    { key: 'total', glyph: '💶', label: t('business.kpi.totalEarnings'), value: earnings.totalEarnings, to: '/business?tab=history' },
    { key: 'last30', glyph: '📈', label: t('business.kpi.last30Days'), value: earnings.earnings30Days, to: '/business?tab=history&range=30d' },
    { key: 'pending', glyph: '⏳', label: t('business.kpi.pendingPayout'), value: earnings.pendingPayout, to: '/wallet?filter=pending' },
    { key: 'wallet', glyph: '👛', label: t('business.kpi.inWallet'), value: earnings.inWallet, to: '/wallet' },
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiRow} testID="business-kpis">
      {cards.map((c) => (
        <View key={c.key} style={styles.kpiCard}>
          <Surface onPress={() => navigateToWebPath(c.to)} accessibilityLabel={c.label} testID={`kpi-${c.key}`}>
            <Text>{c.glyph}</Text>
            <Text weight="700" testID={`kpi-${c.key}-value`}>
              {formatMoney(c.value, locale)}
            </Text>
            <Text variant="caption" muted>
              {c.label}
            </Text>
          </Surface>
        </View>
      ))}
    </ScrollView>
  );
}

/** Where each earning option leads: the nearest existing destination (the create dialogs are web-only). */
export const EARNING_DESTINATIONS = { event: '/comm/events', inventory: null, service: '/commerce', promotion: '/sharing/campaigns' } as const;

export function EarningPortal({ onAddToInventory }: { onAddToInventory: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const options = [
    { key: 'event', glyph: '📅', title: t('business.earning.createEvent'), body: t('business.earning.hostAndSell'), run: () => navigateToWebPath(EARNING_DESTINATIONS.event) },
    { key: 'inventory', glyph: '📦', title: t('business.earning.addToInventory'), body: t('business.earning.resellAndEarn'), run: onAddToInventory },
    { key: 'service', glyph: '💼', title: t('business.earning.createService'), body: t('business.earning.offerBookings'), run: () => navigateToWebPath(EARNING_DESTINATIONS.service) },
    { key: 'promotion', glyph: '📣', title: t('business.earning.createPromotion'), body: t('business.earning.boostVisibility'), run: () => navigateToWebPath(EARNING_DESTINATIONS.promotion) },
  ];
  return (
    <>
      <Surface testID="earning-portal">
        <Text variant="title" style={styles.center}>
          {t('business.earning.readyToEarn')}
        </Text>
        <Text muted style={styles.center}>
          {t('business.earning.choosePathGuide')}
        </Text>
        <Button onPress={() => setOpen(true)} testID="earning-portal-start">
          {t('business.earning.startEarning')}
        </Button>
      </Surface>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t('business.earning.howToEarn')} testID="earning-sheet">
        <Text muted style={styles.center}>
          {t('business.earning.pickOne')}
        </Text>
        <View style={styles.optionGrid}>
          {options.map((o) => (
            <View key={o.key} style={styles.option}>
              <Surface
                accessibilityLabel={o.title}
                testID={`earning-option-${o.key}`}
                onPress={() => {
                  setOpen(false);
                  o.run();
                }}
              >
                <Text>{o.glyph}</Text>
                <Text weight="600">{o.title}</Text>
                <Text variant="caption" muted>
                  {o.body}
                </Text>
              </Surface>
            </View>
          ))}
        </View>
      </BottomSheet>
    </>
  );
}

export function PartnerCard() {
  const { t } = useI18n();
  const { data } = useMyPartnerOrgs();
  const isMember = (data?.length ?? 0) > 0;
  return (
    <Surface onPress={() => navigateToWebPath('/commerce')} accessibilityLabel={isMember ? t('screens.commerceportal.orgOnboarding.sectionTitle') : t('screens.commerceportal.orgOnboarding.registerAsPartnerTitle')} testID="partner-card">
      <View style={styles.partnerRow}>
        <Text>🏢</Text>
        <View style={styles.fill}>
          <Text weight="600">{isMember ? t('screens.commerceportal.orgOnboarding.sectionTitle') : t('screens.commerceportal.orgOnboarding.registerAsPartnerTitle')}</Text>
          <Text variant="caption" muted>
            {isMember ? t('screens.commerceportal.orgOnboarding.openMyOrgsBody') : t('screens.commerceportal.orgOnboarding.registerAsPartnerBody')}
          </Text>
        </View>
        <Icon name="ChevronRight" size={16} />
      </View>
    </Surface>
  );
}

export function EarningsLedger({ rows }: { rows: EarningsTransaction[] }) {
  const { t, locale } = useI18n();
  const [filter, setFilter] = useState<LedgerFilter>('all');
  if (rows.length === 0) {
    return <EmptyState testID="ledger-empty" glyph="🧾" title={t('business.history.noEarningsYet')} body={t('business.history.startSellingToSee')} />;
  }
  const visible = filterLedger(rows, filter);
  return (
    <View style={styles.ledger} testID="earnings-ledger">
      <FilterChips<LedgerFilter>
        groupLabel={t('businessHub.recentActivity')}
        selected={filter}
        onSelect={setFilter}
        testIDPrefix="ledger-filter"
        chips={[
          { key: 'all', label: t('businessNative.inventory.filter.all') },
          { key: 'direct_sale', label: t('business.history.directSales') },
          { key: 'reseller_commission', label: t('business.history.reseller') },
        ]}
      />
      {visible.map((tx) => {
        const isReseller = tx.type === 'reseller_commission';
        return (
          <Surface key={tx.id} testID={`ledger-row-${tx.id}`} onPress={() => navigateToWebPath(`/wallet?filter=${isReseller ? 'reseller' : 'sales'}`)} accessibilityLabel={t('businessNative.ledger.viewInWallet')}>
            <View style={styles.partnerRow}>
              <View style={styles.fill}>
                <Text weight="600">{isReseller ? t('businessNative.ledger.resellerCommission') : t('businessNative.ledger.ticketSale')}</Text>
                <Text variant="caption" muted>
                  {isReseller ? t('businessNative.ledger.sourceSellEarn') : t('businessNative.ledger.sourceMyEvent')} · {formatDay(tx.timestamp, locale)}
                </Text>
              </View>
              <Text weight="700">{formatMoney(tx.amount, locale, tx.currency)}</Text>
            </View>
          </Surface>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: { gap: 8, paddingBottom: 4 },
  kpiCard: { minWidth: 124 },
  center: { textAlign: 'center' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 12 },
  option: { flexBasis: '47%', flexGrow: 1 },
  partnerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fill: { flex: 1 },
  ledger: { gap: 10 },
});
