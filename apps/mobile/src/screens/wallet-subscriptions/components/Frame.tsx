/**
 * VTID-05425 — the page frame pieces both subscriptions screens share: the
 * mobile `StandardHeader` (title only on phones), the wallet `SubNavigation`
 * row (web `walletNavigation`, src/config/navigation.ts), the loading
 * skeletons and the error card. The web sub-nav labels are hard-coded English
 * (`name`, no `i18nKey`); native reads them from the lane's catalog.
 */
import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, CardContent, PressableRow, Skeleton, Text, useUITheme } from '../../../ports/ui';
import { useI18n } from '../../../i18n/I18nProvider';
import { navigateToWebPath } from '../../../navigation/navigate';

/** Web `walletNavigation` (order and paths), labels from walletSubscriptionsNative.subnav. */
export const WALLET_SUBNAV = [
  { id: 'overview', path: '/wallet' },
  { id: 'balance', path: '/wallet/balance' },
  { id: 'subscriptions', path: '/wallet/subscriptions' },
  { id: 'rewards', path: '/wallet/rewards' },
] as const;

export function WalletSubNav({ activeId }: { activeId: (typeof WALLET_SUBNAV)[number]['id'] }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View testID="subs-subnav" accessibilityLabel={t('walletSubscriptionsNative.subnavAria')} style={[styles.subnav, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subnavRow}>
        {WALLET_SUBNAV.map((item) => {
          const active = item.id === activeId;
          const label = t(`walletSubscriptionsNative.subnav.${item.id}`);
          return (
            <PressableRow
              key={item.id}
              testID={`subs-subnav-${item.id}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              onPress={() => {
                if (!active) navigateToWebPath(item.path);
              }}
              style={[styles.subnavItem, active ? { backgroundColor: colors.muted } : null]}
            >
              <Text size="sm" weight="500" muted={!active}>
                {label}
              </Text>
            </PressableRow>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Mobile `StandardHeader`: the page title only (`text-lg font-bold`). */
export function MobileHeader({ title }: { title: string }): ReactElement {
  return (
    <View style={styles.header}>
      <Text size="lg" weight="700" accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

export function SubscriptionsLoading({ testID }: { testID: string }): ReactElement {
  const { t } = useI18n();
  return (
    <View testID={testID} accessibilityLabel={t('walletSubscriptionsNative.loading')} accessibilityRole="progressbar" style={styles.loading}>
      <Skeleton style={styles.skelSm} />
      <Skeleton style={styles.skelMd} />
      <Skeleton style={styles.skelLg} />
    </View>
  );
}

export function SubscriptionsError({ message, testID }: { message: string; testID: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <Card testID={testID}>
      <CardContent style={styles.errorBody}>
        <Text size="sm" color={colors.destructive} style={styles.center}>
          {message}
        </Text>
      </CardContent>
    </Card>
  );
}

/** Web: `error instanceof Error ? error.message : t('billing.checkoutErrors.checkoutFailed')`. The backend's own message when it sent one, else the catalog text (never a raw transport string). */
export function errorMessageOf(error: unknown, fallback: string): string {
  const body = (error as { body?: unknown } | null)?.body;
  const msg = body && typeof body === 'object' ? (body as { message?: unknown }).message : undefined;
  return typeof msg === 'string' && msg ? msg : fallback;
}

const styles = StyleSheet.create({
  subnav: { borderBottomWidth: 1 },
  subnavRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 4 },
  subnavItem: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  header: { paddingTop: 4 },
  loading: { gap: 16 },
  skelSm: { height: 128, borderRadius: 16 },
  skelMd: { height: 192, borderRadius: 16 },
  skelLg: { height: 256, borderRadius: 16 },
  errorBody: { paddingTop: 20 },
  center: { textAlign: 'center' },
});
