/**
 * VTID-05511 (native-wave2-discover-commerce-r2/marketplace-orders) — native
 * port of `src/pages/discover/Marketplace.tsx`, the phone branch (the
 * non-Spotlight return, :167-279; Spotlight is desktop-only):
 *  - header: the title (StandardHeader on phones shows the title only);
 *  - the compact utility rail (`UtilityActionButton compact`): Search with the
 *    view chip ("🛒 Open marketplace" / "📝 My listings" + chevron, which opens
 *    the "Choose a view" sheet), the primary "+ Post" pill, then the global
 *    Life Compass and Gift Voucher pills. The web search's `onSearch` is a
 *    deliberate no-op ("per-view search wiring — defer"), so the field filters
 *    nothing here either; the SplitBar view tabs are desktop-only (`!isMobile`);
 *  - the list: loading skeletons (`SpotlightLoading rows=4`), the error line
 *    ("Couldn't load — <error>"), "open" = the merged commercial_buy +
 *    commercial_sell board (cards not tappable), "mine" = my open commercial
 *    intents (cards open `/intents/match/:id`), each with its empty state +
 *    CTA that opens the composer;
 *  - the view sheet (bottom Sheet, the two options with icon, active one
 *    highlighted) and the intent composer (`defaultKind="commercial_sell"`,
 *    the community lane's native IntentComposer twin), which refreshes the list
 *    after a post.
 * `?view=open|mine` picks the view (default open); a picked view is written
 * back to the param, like the web effect (:69-75), once the member picks it. No cart, checkout or purchase
 * control (no iOS-IAP-gate flag on this screen); the utility rail's gift
 * voucher keeps the shell's iOS gate.
 */
import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BottomSheet, Button, Text, useUITheme } from '../../ports/ui';
import { alpha, CommerceIcon } from '../../ports/marketplace-orders';
import { useI18n } from '../../i18n/I18nProvider';
import { IntentComposer } from '../community/IntentComposer';
import { MobileHeader, PulseSkeletons, ScreenScroll } from './components';
import { IntentCard } from './IntentCard';
import { SearchButton, UtilityBar } from './UtilityBar';
import { useMarketplace, type MarketplaceView } from './data/intents';

const K = 'discoverCommerceNative.marketplaceOrders.marketplace';

const VIEW_OPTIONS: { value: MarketplaceView; icon: string; labelKey: string }[] = [
  { value: 'open', icon: '🛒', labelKey: 'screens.discover.marketplaceView_open' },
  { value: 'mine', icon: '📝', labelKey: 'screens.discover.marketplaceView_mine' },
];

const viewMeta = (v: MarketplaceView) => VIEW_OPTIONS.find((o) => o.value === v) ?? VIEW_OPTIONS[0];

export function MarketplaceScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<MarketplaceView>(() => (params.view === 'mine' ? 'mine' : 'open'));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const { data, isLoading, isError, error, refetch } = useMarketplace(view);

  // The web writes the view back to `?view=` (replace). Natively the param is
  // written when the member picks a view: a write during the first render pass
  // of a cold start would run before the root navigator has mounted.
  const pickView = (v: MarketplaceView) => {
    setView(v);
    if (params.view !== v) router.setParams({ view: v });
  };

  const active = viewMeta(view);
  const items = data ?? [];
  const errorText = error instanceof Error && error.message ? error.message : t(`${K}.couldNotLoad`);

  return (
    <View style={styles.fill} testID="screen-marketplace">
      <ScreenScroll>
        <View style={styles.page}>
          <MobileHeader title={t('screens.discover.marketplace')} />
          <UtilityBar compact returnTo="/discover/marketplace">
            <SearchButton placeholder={t('screens.discover.searchMarketplace')} onSearch={() => undefined} filterLabel={`${active.icon} ${t(active.labelKey)}`} onFilterClick={() => setPickerOpen(true)} testID="marketplace-search" />
            <Pressable testID="marketplace-post" accessibilityRole="button" accessibilityLabel={t('screens.discover.post')} onPress={() => setComposerOpen(true)} style={[styles.post, { backgroundColor: colors.primary }]}>
              <CommerceIcon name="Plus" size={16} color={colors.primaryForeground} />
              <Text size="sm" color={colors.primaryForeground}>
                {t('screens.discover.post')}
              </Text>
            </Pressable>
          </UtilityBar>

          <View style={styles.content}>
            {isLoading ? (
              <PulseSkeletons rows={4} testID="marketplace-loading" />
            ) : isError ? (
              <Text size="sm" color={colors.destructive} style={styles.error} testID="marketplace-error">
                {t('screens.discover.couldnTLoadError', { error: errorText })}
              </Text>
            ) : items.length === 0 ? (
              <EmptyState
                testID={`marketplace-empty-${view}`}
                title={view === 'open' ? t('screens.discover.marketplaceQuiet') : t('screens.discover.noListingsYet')}
                body={view === 'open' ? t('screens.discover.marketplaceEmpty_body') : t(`${K}.mineEmptyBody`)}
                cta={view === 'open' ? t('screens.discover.marketplaceEmpty_cta') : t(`${K}.newListing`)}
                onCta={() => setComposerOpen(true)}
              />
            ) : (
              <View style={styles.list} testID={`marketplace-list-${view}`}>
                {items.map((it) => (view === 'open' ? <IntentCard key={it.intent_id} intent={it} /> : <IntentCard key={it.intent_id} intent={it} to={`/intents/match/${it.intent_id}`} />))}
              </View>
            )}
          </View>
        </View>
      </ScreenScroll>

      <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)} title={t('screens.discover.chooseView')} testID="marketplace-view-sheet">
        <View style={styles.options}>
          {VIEW_OPTIONS.map((o) => {
            const on = view === o.value;
            return (
              <Pressable
                key={o.value}
                testID={`marketplace-view-${o.value}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  pickView(o.value);
                  setPickerOpen(false);
                }}
                style={[styles.option, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? alpha(colors.primary, 0.1) : 'transparent' }]}
              >
                <Text size="xl">{o.icon}</Text>
                <Text weight="500">{t(o.labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      <IntentComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        defaultKind="commercial_sell"
        onPosted={() => {
          setComposerOpen(false);
          void refetch();
        }}
      />
    </View>
  );
}

/** Marketplace.tsx `EmptyState` (:287-298): the bag icon, title, body and CTA. */
function EmptyState({ title, body, cta, onCta, testID }: { title: string; body: string; cta: string; onCta: () => void; testID: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={styles.empty} testID={testID}>
      <CommerceIcon name="ShoppingBag" size={40} color={colors.mutedForeground} />
      <Text size="lg" weight="600" accessibilityRole="header" style={styles.center}>
        {title}
      </Text>
      <Text size="sm" muted style={styles.center}>
        {body}
      </Text>
      <Button onPress={onCta} testID={`${testID}-cta`}>
        {cta}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { paddingHorizontal: 16, paddingTop: 16 },
  content: { marginTop: 16 },
  list: { gap: 12 },
  error: { paddingVertical: 16 },
  post: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 16, gap: 8 },
  center: { textAlign: 'center' },
  options: { gap: 8, paddingBottom: 24 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, borderWidth: 1 },
});
