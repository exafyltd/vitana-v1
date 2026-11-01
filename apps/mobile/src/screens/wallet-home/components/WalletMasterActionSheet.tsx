/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — `OVERLAY.WALLET_POPUP`, the
 * twin of src/components/wallet/WalletMasterActionPopup.tsx as a native bottom
 * sheet: the "Wallet actions" title and the "Transfer & convert" section
 * (send funds, exchange currency, exchange & send — the last with its "Quick"
 * badge). The web hides that whole section on iOS (`!restricted &&`); the
 * native sheet mirrors it, leaving only the title. Picking a step closes the
 * menu and opens that step's flow sheet (the web swaps the dialog body).
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, BottomSheet, Icon, PressableRow, Text, useUITheme } from '../../../ports/ui';
import { radius } from '../../../ports/tokens';
import { useI18n } from '../../../i18n/I18nProvider';
import { isIAPRestricted } from '../iap';
import type { WalletFlowKind } from './WalletFlowSheet';

type Step = { id: 'send' | 'exchange' | 'exchange-and-send'; icon: string; titleKey: string; subtitleKey: string; badgeKey?: string };

const STEPS: Step[] = [
  { id: 'send', icon: 'Send', titleKey: 'screens.wallet.sendFunds', subtitleKey: 'screens.wallet.sendCommunityMembers' },
  { id: 'exchange', icon: 'ArrowUpDown', titleKey: 'screens.wallet.exchangeCurrency', subtitleKey: 'screens.wallet.convertBetweenCreditsVtnaUsd' },
  { id: 'exchange-and-send', icon: 'Zap', titleKey: 'screens.wallet.exchangeSend', subtitleKey: 'screens.wallet.convertCurrencySendOneStep', badgeKey: 'screens.wallet.quick' },
];

export function WalletMasterActionSheet({ open, onClose, onStep }: { open: boolean; onClose: () => void; onStep: (kind: WalletFlowKind) => void }): ReactElement {
  const { colors } = useUITheme();
  const { t } = useI18n();
  const restricted = isIAPRestricted();
  return (
    <BottomSheet testID="wallet-master-popup" open={open} onClose={onClose} title={t('screens.wallet.walletActions')}>
      {!restricted ? (
        <View testID="wallet-master-transfer" style={styles.section}>
          <Text variant="caption" muted>
            {t('screens.wallet.transferConvert')}
          </Text>
          {STEPS.map((s) => (
            <PressableRow
              key={s.id}
              testID={`wallet-master-${s.id}`}
              onPress={() => onStep(s.id)}
              accessibilityLabel={t(s.titleKey)}
              style={[styles.step, { borderColor: colors.border }]}
            >
              <Icon name={s.icon} size={16} color={colors.foreground} />
              <View style={styles.fill}>
                <Text weight="600">{t(s.titleKey)}</Text>
                <Text variant="caption" muted>
                  {t(s.subtitleKey)}
                </Text>
              </View>
              {s.badgeKey ? <Badge variant="secondary">{t(s.badgeKey)}</Badge> : null}
            </PressableRow>
          ))}
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8, paddingBottom: 16 },
  step: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 12 },
  fill: { flex: 1, minWidth: 0 },
});
