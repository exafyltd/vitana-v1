/**
 * VTID-05424 (Native Wave 2, wallet-rewards lane) — the native rewards screen
 * (`/wallet/rewards`, WALLET.REWARDS), a port of the phone branch of
 * src/pages/wallet/Rewards.tsx: the "Zurück zur Wallet" link, the header
 * (title + description) and the three tabs on the `tab` search param, exactly
 * like the web `useUrlTab("tab", "earned")`:
 *   earned (default)  VTNA reward rules + progress (./RewardRules.tsx)
 *   earn              "Mehr verdienen" (./EarnMore.tsx, WALLET.REWARDS_EARN_MORE);
 *                     the former `?tab=intelligence` lands here (VTID-05037)
 *   shop              the reward shop (./RewardShop.tsx, WALLET.REWARDS_SHOP)
 * A tab press writes the param back (`router.setParams`). `?shipping=paid|cancelled`
 * (the web's Stripe return) is passed to the shop as on the web.
 *
 * iOS IAP gate, mirrored one-for-one (plan decision 3 / R3): the web page's one
 * `isIAPRestricted` branch redirects to /home with replace, so the whole
 * rewards page (and with it the shop's redeem / shipping-payment affordance)
 * is unreachable in the iPhone app; Android shows it. The sub-components have
 * no gate of their own on the web, and none here.
 *
 * Not carried over (documented in the PR): the ExpandableSearchButton and
 * UniversalCalendarButton utility pair (the same call the wallet-home lane made
 * for the hub), the desktop SubNavigation and the desktop-only Spotlight
 * layout (the phone branch is the parity target, program §1). React 19:
 * `ReactElement`.
 */
import { useEffect, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PressableRow, Tabs, TabsContent, TabsList, TabsTrigger, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { isIAPRestricted } from './iap';
import { RewardRules } from './RewardRules';
import { EarnMore } from './EarnMore';
import { RewardShop } from './RewardShop';

const TABS: { value: string; labelKey: string }[] = [
  { value: 'earned', labelKey: 'wallet.rewardsPage.tabEarned' },
  { value: 'earn', labelKey: 'wallet.rewardsPage.tabEarnMore' },
  { value: 'shop', labelKey: 'wallet.rewardShop.tab' },
];

export function RewardsScreen(): ReactElement {
  const { colors } = useUITheme();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ tab?: string; shipping?: string }>();
  const urlTab = params.tab || 'earned';
  // VTID-05037: the former "intelligence" tab is now "Mehr verdienen" (earn); old links land there.
  const activeTab = urlTab === 'intelligence' ? 'earn' : urlTab;
  // VTID-04983: back from Stripe Checkout for a shipped reward.
  const shippingReturn = params.shipping === 'paid' || params.shipping === 'cancelled' ? params.shipping : null;
  const restricted = isIAPRestricted();

  // Same as the wallet hub: the wallet stays hidden in the iPhone app until its launch there; Android shows it.
  useEffect(() => {
    if (restricted) router.replace('/home');
  }, [restricted]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="screen-wallet-rewards">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PressableRow
          testID="rewards-back-to-wallet"
          accessibilityRole="link"
          accessibilityLabel={t('wallet.backToWallet')}
          onPress={() => navigateToWebPath('/wallet')}
          style={styles.back}
        >
          <Text size="sm" weight="500" color={colors.primary}>
            {t('wallet.backToWallet')}
          </Text>
        </PressableRow>

        <View style={styles.header}>
          <Text variant="title" accessibilityRole="header">
            {t('wallet.rewardsPage.title')}
          </Text>
          <Text muted>{t('wallet.rewardsPage.description')}</Text>
        </View>

        <Tabs value={activeTab} onValueChange={(tab) => router.setParams({ tab })} style={styles.tabs}>
          <TabsList accessibilityLabel={t('walletRewardsNative.tabsLabel')}>
            {TABS.map((x) => (
              <TabsTrigger key={x.value} value={x.value} testID={`rewards-tab-${x.value}`} style={styles.trigger}>
                {t(x.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="earned">
            <RewardRules />
          </TabsContent>
          <TabsContent value="earn">
            <EarnMore />
          </TabsContent>
          <TabsContent value="shop">
            <RewardShop shippingReturn={shippingReturn} />
          </TabsContent>
        </Tabs>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 128, gap: 16 },
  back: { minHeight: 44, alignSelf: 'flex-start' },
  header: { gap: 4 },
  tabs: { gap: 16 },
  trigger: { flex: 1 },
});
