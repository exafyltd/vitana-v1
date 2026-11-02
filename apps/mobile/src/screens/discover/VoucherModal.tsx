/**
 * VTID-05510 — twin of src/components/voucher/MaxinaVoucherModal.tsx, the
 * gift-voucher dialog of the utility rail's Gift Voucher pill:
 *  - selection (:327-475): title + subtitle, the three tiers (test €0.49,
 *    experience €99, exclusive €199) with their catalog name and benefits
 *    (`voucher.tiers.<tier>.benefits`, a string array), the selected check,
 *    and "Buy voucher · €N" (disabled until a tier is picked);
 *  - loading (:477-490): "opening secure checkout";
 *  - buy (:141-166): the `stripe-create-voucher-checkout` edge function with
 *    `{ tier, returnTo }` (returnTo = this screen's route), then the Stripe
 *    page — the web navigates the window, natively the system browser; a
 *    failure toasts `voucher.toast.checkoutFailed` and returns to the selection.
 * The success / e-mail / PDF states run on the Stripe return URL
 * (`voucher_success=true`, :112-130) on the web origin, not in this dialog.
 *
 * iOS IAP gate (R5): a digital-purchase surface. Rendered only where IAP is
 * not restricted — the UtilityBar's `isIAPRestricted()` =
 * `Platform.OS === 'ios'`, today's shell rule (drawer.ts:37-38), unchanged.
 */
import { useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Button, Spinner, Text, useUITheme } from '../../ports/ui';
import { alpha, Dialog, DialogContent, DiscoverIcon, notifyError, useTonePalette } from '../../ports/discover';
import { catalogs, FALLBACK_LOCALE, isLocale } from '../../i18n';
import { useI18n } from '../../i18n/I18nProvider';
import { createVoucherCheckout } from './data/utility';

type Tier = 'test' | 'experience' | 'exclusive';
const TIERS: Array<{ id: Tier; price: number; icon: string }> = [
  { id: 'test', price: 0.49, icon: 'Gift' },
  { id: 'experience', price: 99, icon: 'Sparkles' },
  { id: 'exclusive', price: 199, icon: 'Crown' },
];

/** `t.voucher.tiers.<tier>.benefits` — a string array in the catalog (the web reads the object, not `translate`). */
function benefitsFor(locale: string, tier: Tier): string[] {
  const read = (l: string): unknown => {
    const v = (catalogs as Record<string, Record<string, unknown>>)[l]?.voucher as { tiers?: Record<string, { benefits?: unknown }> } | undefined;
    return v?.tiers?.[tier]?.benefits;
  };
  const own = isLocale(locale) ? read(locale) : undefined;
  const list = Array.isArray(own) ? own : read(FALLBACK_LOCALE);
  return Array.isArray(list) ? list.filter((b): b is string => typeof b === 'string') : [];
}

export function VoucherModal({ open, onOpenChange, returnTo }: { open: boolean; onOpenChange: (open: boolean) => void; returnTo: string }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const tone = useTonePalette();
  const tierTint = [colors.statusSuccess, tone('category-2'), colors.statusWarning];
  const [selected, setSelected] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(false);

  const close = (next: boolean) => {
    if (!next) {
      setSelected(null);
      setLoading(false);
    }
    onOpenChange(next);
  };

  const buy = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const data = await createVoucherCheckout(selected, returnTo);
      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
        close(false);
        return;
      }
      setLoading(false);
    } catch {
      notifyError('voucher.toast.checkoutFailed');
      setLoading(false);
    }
  };

  const price = selected ? TIERS.find((x) => x.id === selected)?.price : null;
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent testID="voucher-modal">
        {loading ? (
          <View style={styles.loading} testID="voucher-loading">
            <Spinner accessibilityLabel={t('voucher.modal.openingCheckout')} />
            <Text size="sm" muted>
              {t('voucher.modal.openingCheckout')}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <DiscoverIcon name="Gift" size={20} color={colors.primary} />
                <Text size="lg" weight="600" accessibilityRole="header">
                  {t('voucher.modal.title')}
                </Text>
              </View>
              <Text size="sm" muted>
                {t('voucher.modal.subtitle')}
              </Text>
            </View>
            <ScrollView style={styles.list} contentContainerStyle={styles.listBody}>
              {TIERS.map((tier, i) => {
                const isSelected = selected === tier.id;
                return (
                  <Pressable
                    key={tier.id}
                    testID={`voucher-tier-${tier.id}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelected(tier.id)}
                    style={[styles.tier, { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? alpha(colors.primary, 0.05) : colors.background }]}
                  >
                    <View style={[styles.tierIcon, { backgroundColor: tierTint[i] }]}>
                      <DiscoverIcon name={tier.icon} size={20} color={colors.primaryForeground} />
                    </View>
                    <View style={styles.flex}>
                      <View style={styles.tierHead}>
                        <Text weight="600">{t(`voucher.tiers.${tier.id}.name`)}</Text>
                        <Text size="lg" weight="700">{`€${tier.price}`}</Text>
                      </View>
                      {benefitsFor(locale, tier.id).map((b, j) => (
                        <View key={j} style={styles.benefit}>
                          <DiscoverIcon name="Check" size={12} color={colors.primary} />
                          <Text size="xs" muted style={styles.flex}>
                            {b}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {isSelected ? (
                      <View style={[styles.check, { backgroundColor: colors.primary }]}>
                        <DiscoverIcon name="Check" size={12} color={colors.primaryForeground} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Button testID="voucher-buy" disabled={!selected} onPress={() => void buy()}>
              <DiscoverIcon name="Gift" size={16} color={colors.primaryForeground} />
              {price != null ? `${t('voucher.modal.buyVoucher')} · €${price}` : t('voucher.modal.buyVoucher')}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: 4, paddingEnd: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  list: { maxHeight: 420 },
  listBody: { gap: 12 },
  tier: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 12, borderWidth: 2 },
  tierIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tierHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  check: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  loading: { alignItems: 'center', gap: 12, paddingVertical: 48 },
});
