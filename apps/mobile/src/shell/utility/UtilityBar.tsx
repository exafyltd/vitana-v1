/**
 * VTID-05653 (native-wave2-fix-forward-r2/utility-bar) — the one native utility
 * bar, twin of `src/components/ui/utility-action-button.tsx`: a horizontally
 * scrolling rail in the web order (:26-27, :97-125)
 *
 *   children (the page's pills) · Life Compass · Gift Voucher ·
 *   afterGiftVoucher · trailing
 *
 * Life Compass (:102-112) and Gift Voucher (:115-117) only emit
 * `vitana:open-life-compass` / `gift-voucher:open` `{ returnTo }`; the hosts in
 * `shell/OverlayHost.tsx` open the one popup and the one modal, so every screen
 * that emits the event works. Gift Voucher is hidden where IAP is restricted
 * (`isIAPRestricted()`, :43; natively the shell's rule, `Platform.OS === 'ios'`,
 * shell/logic/drawer.ts:37-38).
 */
import type { ReactElement, ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { Text, useUITheme } from '../../ports/ui';
import { UtilityIcon } from '../../ports/utility';
import { overlayBus } from '../../navigation/overlay-bus';
import { useI18n } from '../../i18n/I18nProvider';
import { RailPill } from './buttons';
import { GIFT_VOUCHER_OPEN, LIFE_COMPASS_OPEN } from './events';

/** `isIAPRestricted()` — the shell's rule (drawer.ts:37-38), unchanged. */
export function isIAPRestricted(): boolean {
  return Platform.OS === 'ios';
}

export function UtilityBar({
  children,
  afterGiftVoucher,
  trailing,
  compact = true,
}: {
  children?: ReactNode;
  afterGiftVoucher?: ReactNode;
  trailing?: ReactNode;
  compact?: boolean;
}): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const pathname = usePathname();
  return (
    <View testID="utility-bar" style={compact ? styles.wrapCompact : styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.rail} testID="utility-rail">
        {children}
        <RailPill testID="utility-life-compass" label={t('lifeCompass.title')} onPress={() => overlayBus.emit(LIFE_COMPASS_OPEN)}>
          <UtilityIcon name="Target" size={16} color={colors.mutedForeground} />
          <Text size="sm">{t('lifeCompass.title')}</Text>
        </RailPill>
        {!isIAPRestricted() ? (
          <RailPill testID="utility-gift-voucher" label={t('actionBar.giftVoucher')} onPress={() => overlayBus.emit(GIFT_VOUCHER_OPEN, { returnTo: pathname })}>
            <UtilityIcon name="Gift" size={16} color={colors.mutedForeground} />
            <Text size="sm">{t('actionBar.giftVoucher')}</Text>
          </RailPill>
        ) : null}
        {afterGiftVoucher}
        {trailing}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 16, paddingBottom: 20 },
  wrapCompact: { paddingVertical: 8 },
  rail: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
});
