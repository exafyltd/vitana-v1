/**
 * VTID-05512 — twin of src/components/wallet/AddMoneyDialog.tsx (gateway
 * commerce wallet rail): title + description, the amount in MAJOR units
 * (decimal keyboard, "," accepted), EUR / USD, "Continue to payment" (spinner
 * + "Preparing …" while creating). Re-seeded with the prefill every time it
 * opens (a failed INSUFFICIENT_BALANCE checkout passes the missing amount and
 * the currency). A non-positive amount → the invalid-amount toast; a failed
 * create → the failed toast. On success the Stripe hosted checkout opens
 * (data/wallet.ts `useCreateDeposit`); when the browser returns the dialog
 * closes (the web has left the page for Stripe) and the cart's return leg
 * shows the outcome (data/depositReturn.ts).
 *
 * iOS IAP gate flag (requirements R5, highest priority): the wallet top-up.
 * Today's behaviour — shown on every platform like the web; the shell's
 * `iapRestricted` (drawer.ts:37-38) hides only the wallet drawer row; the
 * gate extension is program decision 5, deferred. Nothing added or removed.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Spinner } from '../../../ports/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  notifyError,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ports/commerce';
import { useI18n } from '../../../i18n/I18nProvider';
import { useCreateDeposit, type WalletCurrency } from '../data/wallet';
import { toMinorUnits } from '../format';

export function AddMoneyDialog({
  open,
  onOpenChange,
  initialCurrency,
  initialAmountMajor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCurrency?: WalletCurrency;
  initialAmountMajor?: number;
}): ReactElement {
  const { t } = useI18n();
  const { createDeposit, isCreating } = useCreateDeposit();
  const [currency, setCurrency] = useState<WalletCurrency>(initialCurrency ?? 'EUR');
  const [amount, setAmount] = useState<string>(initialAmountMajor != null ? String(initialAmountMajor) : '');

  useEffect(() => {
    if (open) {
      setCurrency(initialCurrency ?? 'EUR');
      setAmount(initialAmountMajor != null ? String(initialAmountMajor) : '');
    }
  }, [open, initialCurrency, initialAmountMajor]);

  const onContinue = async () => {
    const major = Number(amount.replace(',', '.'));
    if (!Number.isFinite(major) || major <= 0) {
      notifyError('marketplaceCheckout.addMoney.invalidAmount');
      return;
    }
    try {
      await createDeposit({ amount_minor: toMinorUnits(major), currency });
      onOpenChange(false);
    } catch {
      notifyError('marketplaceCheckout.addMoney.failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent testID="add-money-dialog">
        <DialogHeader>
          <DialogTitle>{t('marketplaceCheckout.addMoney.title')}</DialogTitle>
          <DialogDescription>{t('marketplaceCheckout.addMoney.description')}</DialogDescription>
        </DialogHeader>
        <View style={styles.form}>
          <View style={styles.field}>
            <Label nativeID="add-money-amount-label">{t('marketplaceCheckout.addMoney.amountLabel')}</Label>
            <Input
              testID="add-money-amount"
              accessibilityLabel={t('marketplaceCheckout.addMoney.amountLabel')}
              accessibilityLabelledBy="add-money-amount-label"
              keyboardType="decimal-pad"
              inputMode="decimal"
              value={amount}
              onChangeText={setAmount}
              placeholder={t('marketplaceCheckout.addMoney.amountPlaceholder')}
              disabled={isCreating}
            />
          </View>
          <View style={styles.field}>
            <Label>{t('marketplaceCheckout.addMoney.currencyLabel')}</Label>
            <Select value={currency} onValueChange={(v: string) => setCurrency(v as WalletCurrency)} disabled={isCreating}>
              <SelectTrigger testID="add-money-currency" accessibilityLabel={t('marketplaceCheckout.addMoney.currencyLabel')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent testID="add-money-currency-list">
                <SelectItem value="EUR" testID="add-money-currency-EUR">
                  {t('marketplaceCheckout.addMoney.currencyEur')}
                </SelectItem>
                <SelectItem value="USD" testID="add-money-currency-USD">
                  {t('marketplaceCheckout.addMoney.currencyUsd')}
                </SelectItem>
              </SelectContent>
            </Select>
          </View>
          <Button testID="add-money-continue" onPress={() => void onContinue()} disabled={isCreating} style={styles.full}>
            {isCreating ? <Spinner accessibilityLabel={t('marketplaceCheckout.addMoney.processing')} /> : null}
            {isCreating ? t('marketplaceCheckout.addMoney.processing') : t('marketplaceCheckout.addMoney.continue')}
          </Button>
        </View>
      </DialogContent>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, paddingVertical: 8 },
  field: { gap: 8 },
  full: { alignSelf: 'stretch' },
});
