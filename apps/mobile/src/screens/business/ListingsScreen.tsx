/**
 * VTID-05645 (native-wave2-sharing-business-r3/business-hub) — native port of Business Hub My Listings
 * (`src/pages/BusinessListings.tsx`, `/business/listings`): the provider's commercial_sell offers
 * (`GET /intents?kind=commercial_sell`), Pro (reseller) gated. "New listing" opens the community
 * `IntentComposer` defaulted to commercial_sell, like the web composer; a listing opens its match
 * detail. React 19: typed with `ReactElement`.
 */
import { useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { IntentCard } from '../community/IntentCard';
import { IntentComposer } from '../community/IntentComposer';
import { EmptyState, ErrorState, LoadingRows } from './components';
import { useIsReseller, useMyListings } from './data/queries';

export function ListingsScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { isReseller, isLoading: roleLoading } = useIsReseller();
  const q = useMyListings(isReseller);
  const [composerOpen, setComposerOpen] = useState(false);
  const listings = q.data ?? [];
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page} testID="screen-business-listings">
      <Button variant="ghost" size="sm" onPress={() => navigateToWebPath('/business')} testID="listings-back">
        {t('screens.businesslistings.backBusinessHub')}
      </Button>
      <View style={styles.header}>
        <View style={styles.fill}>
          <Text variant="title" accessibilityRole="header">
            {t('screens.businesslistings.myListings')}
          </Text>
          <Text muted>{t('screens.businesslistings.servicesProductsYouReOfferingMatches')}</Text>
        </View>
        {isReseller ? (
          <Button size="sm" onPress={() => setComposerOpen(true)} testID="listings-new">
            {t('screens.businesslistings.newListing')}
          </Button>
        ) : null}
      </View>
      {roleLoading ? (
        <LoadingRows testID="listings-loading" />
      ) : !isReseller ? (
        <EmptyState testID="listings-locked" glyph="🔒" title={t('screens.businesslistings.listingsAvailableForProAccounts')} />
      ) : q.isPending ? (
        <LoadingRows testID="listings-loading" />
      ) : q.isError ? (
        <ErrorState testID="listings-error" message={t('toasts.businesslistings.couldNotLoadListings')} retryLabel={t('communityHubNative.common.retry')} onRetry={() => void q.refetch()} />
      ) : listings.length === 0 ? (
        <EmptyState
          testID="listings-empty"
          glyph="🏷"
          title={t('screens.businesslistings.noListingsYetClick')}
          body={`${t('screens.businesslistings.newListing')}${t('screens.businesslistings.addOneOpenOrbJustSay')} ${t('screens.businesslistings.iMOfferingX')}`}
          action={{ label: t('screens.businesslistings.newListing'), onPress: () => setComposerOpen(true) }}
        />
      ) : (
        <View style={styles.list} testID="listings-list">
          {listings.map((intent) => (
            <IntentCard key={intent.intent_id} intent={intent} testID={`listing-${intent.intent_id}`} onPress={() => navigateToWebPath(`/intents/match/${intent.intent_id}`)} />
          ))}
        </View>
      )}
      <IntentComposer open={composerOpen} onClose={() => setComposerOpen(false)} defaultKind="commercial_sell" onPosted={() => void q.refetch()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  fill: { flex: 1 },
  list: { gap: 12 },
});
