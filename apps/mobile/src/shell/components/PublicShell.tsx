/**
 * VTID-05186 (N3, plan change 18) — src/components/PublicAppShell.tsx: the
 * storefront shell for signed-out visitors on guest destinations — Discover
 * and Sign in, no member chrome, no auth-scoped hooks.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, PressableRow, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useCurrentHref } from '../AuthGate';

export function PublicShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const href = useCurrentHref();
  const onDiscover = pathname === '/discover' || pathname.startsWith('/discover/');
  return (
    <View style={{ flex: 1 }} testID="public-shell">
      <View style={[styles.bar, { paddingTop: insets.top, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View style={styles.row}>
          <PressableRow testID="public-discover" accessibilityRole="link" onPress={() => router.navigate('/discover' as never)} style={[styles.chip, onDiscover ? { backgroundColor: colors.muted } : null]}>
            <Icon name="Search" size={16} color={colors.foreground} />
            <Text>{t('sidebar.discover')}</Text>
          </PressableRow>
          <PressableRow
            testID="public-sign-in"
            onPress={() => router.navigate(`/maxina?redirectTo=${encodeURIComponent(href)}` as never)}
            style={[styles.signIn, { backgroundColor: colors.primary }]}
          >
            <Icon name="LogIn" size={16} color={colors.primaryForeground} />
            <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>{t('discover.guest.signIn')}</Text>
          </PressableRow>
        </View>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  signIn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
});
