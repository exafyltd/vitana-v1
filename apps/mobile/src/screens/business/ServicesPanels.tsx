/**
 * VTID-05645 (native-wave2-sharing-business-r3/business-hub) — the Services and Insights tabs of the
 * Business Hub: My Services (empty state), My Events (organizer ticket sales), Packages, Clients
 * (active / prospects / history) and the three "coming soon" insight panes (web mobile branch,
 * `ClientsSubTabs`, `OrganizerEventsSection`, `PackageCard`).
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Text } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { EmptyState, ErrorState, FilterChips, LoadingRows, Surface } from './components';
import { formatMoney } from './earnings';
import { formatDay } from './format';
import { useBusinessPackages, useOrganizerEvents, type OrganizerEvent, type PackageRow } from './data/queries';

export function ServicesEmpty() {
  const { t } = useI18n();
  return (
    <EmptyState
      testID="services-empty"
      glyph="💼"
      title={t('screens.businesshub.noServicesYet')}
      body={t('screens.businesshub.createCoachingSessionsConsultationsOtherServices')}
      action={{ label: t('screens.businesshub.createService'), onPress: () => navigateToWebPath('/commerce'), testID: 'services-create' }}
    />
  );
}

export function OrganizerEvents() {
  const { t, locale } = useI18n();
  const q = useOrganizerEvents();
  const [selected, setSelected] = useState<OrganizerEvent | null>(null);
  if (q.isPending) return <LoadingRows testID="events-loading" />;
  if (q.isError) return <ErrorState testID="events-error" message={t('businessNative.events.loadError')} retryLabel={t('communityHubNative.common.retry')} onRetry={() => void q.refetch()} />;
  const events = q.data ?? [];
  if (events.length === 0) {
    return <EmptyState testID="events-empty" glyph="🎫" title={t('screens.business.noTicketedEventsYet')} body={t('screens.business.createEventWithTicketSalesSee')} />;
  }
  return (
    <View style={styles.list} testID="events-list">
      {events.map((e) => (
        <Surface key={e.id} testID={`event-${e.id}`} accessibilityLabel={e.title} onPress={() => setSelected(selected?.id === e.id ? null : e)}>
          <Text weight="600">{e.title}</Text>
          <Text variant="caption" muted>
            {e.location ? `📍 ${e.location}` : t('businessNative.events.online')} · 📅 {formatDay(e.start_time, locale, true)}
          </Text>
          <View style={styles.metaRow}>
            <Text variant="caption">🎫 {t('businessNative.events.sold', { count: e.ticketsSold })}</Text>
            <Text variant="caption">💶 {formatMoney(e.totalRevenue, locale)}</Text>
            <Text variant="caption">✅ {t('businessNative.events.checkedIn', { count: e.checkedInCount })}</Text>
          </View>
          {e.ticketsSold > 0 ? <Badge variant="secondary">{t('businessNative.events.buyers', { count: e.buyerCount })}</Badge> : null}
          {selected?.id === e.id ? (
            <Text variant="caption" muted testID={`event-${e.id}-sales`}>
              {t('businessNative.events.sold', { count: e.ticketsSold })} / {e.totalCapacity} · {formatMoney(e.totalRevenue, locale)}
            </Text>
          ) : (
            <Text variant="caption" weight="600">
              {t('businessNative.events.viewSales')}
            </Text>
          )}
        </Surface>
      ))}
    </View>
  );
}

function PackageCard({ pkg }: { pkg: PackageRow }) {
  const { t, locale } = useI18n();
  const items = pkg.items?.length ?? 0;
  const savings = pkg.original_price_cents && pkg.original_price_cents > pkg.price_cents ? Math.round(((pkg.original_price_cents - pkg.price_cents) / pkg.original_price_cents) * 100) : 0;
  return (
    <Surface testID={`package-${pkg.id}`}>
      <View style={styles.metaRow}>
        <Badge variant="outline">{t(`businessNative.packages.type.${pkg.package_type}`)}</Badge>
        <Badge variant="secondary">{t(`businessNative.packages.status.${pkg.status}`)}</Badge>
      </View>
      <Text weight="600">{pkg.title}</Text>
      {pkg.description ? (
        <Text variant="caption" muted numberOfLines={2}>
          {pkg.description}
        </Text>
      ) : null}
      <View style={styles.metaRow}>
        <Text variant="caption">📦 {t('businessNative.packages.items', { count: items })}</Text>
        <Text weight="700">{formatMoney(pkg.price_cents / 100, locale, pkg.currency || 'USD')}</Text>
        {savings > 0 ? <Text variant="caption">{t('businessNative.packages.save', { percent: savings })}</Text> : null}
      </View>
    </Surface>
  );
}

export function PackagesPanel() {
  const { t } = useI18n();
  const q = useBusinessPackages();
  if (q.isPending) return <LoadingRows testID="packages-loading" />;
  if (q.isError) return <ErrorState testID="packages-error" message={t('communityHubNative.common.errorBody')} retryLabel={t('communityHubNative.common.retry')} onRetry={() => void q.refetch()} />;
  const packages = q.data ?? [];
  if (packages.length === 0) {
    return <EmptyState testID="packages-empty" glyph="📦" title={t('screens.businesshub.createSessionPackages')} body={t('screens.businesshub.bundleMultipleSessionsEventsPerksInto')} />;
  }
  return (
    <View style={styles.list} testID="packages-list">
      {packages.map((p) => (
        <PackageCard key={p.id} pkg={p} />
      ))}
    </View>
  );
}

type ClientsTab = 'active' | 'prospects' | 'history';

export function ClientsPanel() {
  const { t } = useI18n();
  const [tab, setTab] = useState<ClientsTab>('active');
  return (
    <View style={styles.list} testID="clients-panel">
      <FilterChips<ClientsTab>
        groupLabel={t('businessNative.tabs.clients')}
        selected={tab}
        onSelect={setTab}
        testIDPrefix="clients-tab"
        chips={[
          { key: 'active', label: t('screens.business.active') },
          { key: 'prospects', label: t('screens.business.prospects') },
          { key: 'history', label: t('screens.business.history') },
        ]}
      />
      {tab === 'active' ? (
        <EmptyState testID="clients-active" glyph="👥" title={t('screens.business.noActiveClients')} body={t('screens.business.activeClientsWithSubscriptionsBookingsWill')} />
      ) : null}
      {tab === 'prospects' ? (
        <EmptyState
          testID="clients-prospects"
          glyph="🎯"
          title={t('screens.business.noProspectsYet')}
          body={t('screens.business.leadsFromSharingCampaignsResellerLinks')}
          action={{ label: t('screens.business.promoteViaSharing'), onPress: () => navigateToWebPath('/sharing') }}
        />
      ) : null}
      {tab === 'history' ? (
        <EmptyState testID="clients-history" glyph="📜" title={t('screens.business.noPastClients')} body={t('screens.business.clientsWhoHadPastSessionsBut')} />
      ) : null}
    </View>
  );
}

export function InsightPane({ kind }: { kind: 'performance' | 'earnings' | 'growth' }) {
  const { t } = useI18n();
  const copy = {
    performance: { glyph: '📊', title: 'screens.businesshub.performance', body: 'screens.businesshub.bookingAnalyticsComingSoon' },
    earnings: { glyph: '📈', title: 'screens.businesshub.earnings', body: 'screens.businesshub.earningsBreakdownComingSoon' },
    growth: { glyph: '👥', title: 'screens.businesshub.growth', body: 'screens.businesshub.growthAnalyticsComingSoon' },
  }[kind];
  return <EmptyState testID={`insight-${kind}`} glyph={copy.glyph} title={t(copy.title)} body={t(copy.body)} />;
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
});
