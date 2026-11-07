/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — `/discover`
 * (DISCOVER.OVERVIEW; `?tab=suggested` DISCOVER.AI_PICKS, `?tab=categories`
 * DISCOVER.CATEGORIES, `?tab=share` DISCOVER.SHARE_EARN), the mobile-web
 * branch of src/pages/Discover.tsx (`isMobile`, no SubNavigation):
 *
 *  1. the mobile header (`discover.mobileTitle`);
 *  2. the guest card for signed-out visitors (or a guest feed): Gift icon,
 *     title + subtitle, "Sign in" → the tenant portal with `?redirectTo=`;
 *  3. the compact utility rail: Search ("Search…", inert like the web) · the
 *     MobileModePill (💡 Vitana Picks · 📂 Categories · 💰 Share & Earn) ·
 *     Calendar · Life Compass · Gift Voucher (not on iOS) · 🧬 Index (→ /health)
 *     · Autopilot with the pulsing pending badge;
 *  4. the `MobileDiscoverView` twin for the active pill;
 *  5. the product drawer (ProductSelectionProvider + ProductDetailsDrawer).
 *
 * The `tab` param picks the pill (only suggested / categories / share; an
 * absent or invalid value never resets it). A `?m=<match>` deep link is
 * cleared at once; the mobile view renders no `data-match-id` targets, so —
 * like the web after its five retries (300 ms + 5 × 400 ms) — it ends in the
 * "match not found" toast. A `discover.view` activity row is logged on mount.
 * The feed is `GET /discover/feed?limit=12`, mapped to the web's
 * AIRecommendation shape. `/discover/ai-picks` resolves here with
 * `?tab=suggested` (src/navigation/resolve.ts, sparring R1-F1).
 *
 * iOS IAP gate flags (R5): the add-to-cart legs (product drawer) and the gift
 * voucher — today's behaviour, `iapRestricted` = `Platform.OS === 'ios'`
 * hides the voucher only (shell/logic/drawer.ts:37-38); deferred decision.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Text, useUITheme } from '../../ports/ui';
import { alpha, DiscoverIcon, formatPrice, notifyError, useTonePalette } from '../../ports/discover';
import { MobileModePill, type ModeOption } from '../../shell/components/MobileModePill';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { MobileHeader } from './chrome';
import { MobileDiscoverView, type AIRecommendation } from './MobileDiscoverView';
import { ProductDetailsDrawer, ProductSelectionProvider } from './ProductDetailsDrawer';
import { AutopilotPill, CalendarButton, IndexPill, SearchButton, UtilityBar } from './UtilityBar';
import { useMarketplaceFeed, type MarketplaceProduct } from './data/marketplace';
import { logActivity, useAutopilotPendingCount } from './data/utility';

export type DiscoverTab = 'suggested' | 'categories' | 'share';
const VALID_TABS = new Set<string>(['suggested', 'categories', 'share']);

/** web `resolveDiscoverTab`: null for absent / invalid, so an unrelated param change never resets the pill. */
export function resolveDiscoverTab(raw: string | null | undefined): DiscoverTab | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  return VALID_TABS.has(v) ? (v as DiscoverTab) : null;
}

/** The web match-scroll gives up after 300 ms + 5 retries × 400 ms. */
export const MATCH_GIVE_UP_MS = 300 + 5 * 400;

/** web `loginRouteWithRedirect()` (src/lib/guest-auth.ts): the Maxina portal with the page preserved. */
export function signInRoute(current: string): string {
  return `/maxina?redirectTo=${encodeURIComponent(current)}`;
}

export function toRecommendations(items: MarketplaceProduct[], t: (k: string) => string): AIRecommendation[] {
  return items.map((p, idx) => ({
    id: idx + 1,
    title: p.title,
    description: p.description ?? '',
    price: formatPrice(p.price_cents, p.currency),
    match: Math.round((p.match_score ?? p.rank_score ?? 0.7) * 100),
    reason: p.match_reasons?.[0]?.text ?? p.rank_reasons?.[0] ?? '',
    provider: p.brand ?? 'Vitana Shop',
    image: p.images?.[0] ?? '',
    badge: (p.match_score ?? p.rank_score ?? 0) > 0.8 ? t('discover.matchPerfect') : (p.match_score ?? p.rank_score ?? 0) > 0.5 ? t('discover.matchGreat') : t('discover.matchGood'),
    _product: p,
  }));
}

function DiscoverInner(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const tone = useTonePalette();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ tab?: string; m?: string }>();
  const [activeTab, setActiveTab] = useState<string>(() => resolveDiscoverTab(params.tab) ?? 'suggested');
  const pendingCount = useAutopilotPendingCount();

  useEffect(() => {
    const tab = resolveDiscoverTab(params.tab);
    if (tab) setActiveTab(tab);
  }, [params.tab]);

  useEffect(() => {
    if (!params.m) return undefined;
    router.setParams({ m: undefined });
    const id = setTimeout(() => notifyError('toasts.discover.matchNotFound', 'toasts.discover.thisMatchNoLongerAvailable'), MATCH_GIVE_UP_MS);
    return () => clearTimeout(id);
  }, [params.m]);

  useEffect(() => {
    void logActivity({ activityType: 'discover.view', activityData: { page: 'overview' }, dedupeKey: `discover-view-${Date.now()}` });
  }, []);

  const { data: feedData } = useMarketplaceFeed({ limit: 12 });
  const isGuest = !user || feedData?.feed_context?.guest === true;
  const current = params.tab ? `/discover?tab=${params.tab}` : '/discover';
  const recommendations = toRecommendations(feedData?.items ?? [], t);

  const modes: ModeOption[] = [
    { value: 'suggested', label: t('discover.vitanaPicksLabel'), icon: '💡' },
    { value: 'categories', label: t('screens.discover.categories'), icon: '📂' },
    { value: 'share', label: t('screens.discover.shareEarn'), icon: '💰' },
  ];
  const primary = colors.primary;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page} testID="screen-discover" keyboardShouldPersistTaps="handled">
      <MobileHeader title={t('discover.mobileTitle')} />

      {isGuest ? (
        <View style={[styles.guest, { borderColor: alpha(primary, 0.3), backgroundColor: alpha(tone('category-2'), 0.06) }]} testID="discover-guest-cta">
          <View style={styles.guestLead}>
            <View style={[styles.guestIcon, { backgroundColor: alpha(primary, 0.15) }]}>
              <DiscoverIcon name="Gift" size={20} color={primary} />
            </View>
            <View style={styles.flexShrink}>
              <Text size="sm" weight="600" style={styles.center}>
                {t('discover.guest.bannerTitle')}
              </Text>
              <Text size="xs" muted style={styles.center}>
                {t('discover.guest.bannerSubtitle')}
              </Text>
            </View>
          </View>
          <Button size="sm" testID="discover-guest-sign-in" onPress={() => navigateToWebPath(signInRoute(current))} style={styles.fullWidth}>
            {t('discover.guest.bannerCta')}
          </Button>
        </View>
      ) : null}

      <UtilityBar
        compact
        returnTo={current}
        afterGiftVoucher={
          <>
            <IndexPill />
            <AutopilotPill pendingCount={pendingCount} />
          </>
        }
      >
        <SearchButton placeholder={t('discoverCommerceNative.searchShort')} />
        <MobileModePill modes={modes} activeMode={activeTab} onModeChange={setActiveTab} title={t('screens.ui.selectMode')} />
        <CalendarButton />
      </UtilityBar>

      <MobileDiscoverView aiRecommendations={recommendations} activeTab={activeTab} />
      <ProductDetailsDrawer />
    </ScrollView>
  );
}

export function DiscoverScreen(): ReactElement {
  return (
    <ProductSelectionProvider>
      <DiscoverInner />
    </ProductSelectionProvider>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 128, gap: 12 },
  guest: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12, alignItems: 'center' },
  guestLead: { flexDirection: 'column', alignItems: 'center', gap: 12 },
  guestIcon: { borderRadius: 999, padding: 8 },
  flexShrink: { flexShrink: 1 },
  center: { textAlign: 'center' },
  fullWidth: { alignSelf: 'stretch' },
});
