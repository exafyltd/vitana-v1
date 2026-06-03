/**
 * Marketplace money loop — Add Money dialog (gateway commerce wallet rail).
 *
 * Lets the user top up their EUR/USD gateway wallet via a Stripe deposit.
 * Amount is entered in MAJOR units and converted to integer MINOR units before
 * being sent to the gateway. On submit the browser is redirected to Stripe.
 *
 * ADDITIVE — does NOT touch the legacy useWallet / user_wallets rail.
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useCreateDeposit } from "@/hooks/useWalletGateway";
import { WalletCurrency } from "@/lib/wallet-gateway-client";
import { toMinorUnits } from "@/lib/format-money";
import { notifyError, t } from "@/lib/i18n-toast";

interface AddMoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill the currency (e.g. from an INSUFFICIENT_BALANCE error). */
  initialCurrency?: WalletCurrency;
  /** Prefill the amount in MAJOR units (e.g. the required top-up). */
  initialAmountMajor?: number;
}

export function AddMoneyDialog({
  open,
  onOpenChange,
  initialCurrency,
  initialAmountMajor,
}: AddMoneyDialogProps) {
  const { createDeposit, isCreating } = useCreateDeposit();
  const [currency, setCurrency] = useState<WalletCurrency>(initialCurrency ?? "EUR");
  const [amount, setAmount] = useState<string>(
    initialAmountMajor != null ? String(initialAmountMajor) : "",
  );

  // Re-seed the form whenever the dialog is (re)opened so callers can prefill
  // a required currency/amount from a failed checkout.
  useEffect(() => {
    if (open) {
      setCurrency(initialCurrency ?? "EUR");
      setAmount(initialAmountMajor != null ? String(initialAmountMajor) : "");
    }
  }, [open, initialCurrency, initialAmountMajor]);

  const handleContinue = async () => {
    const major = Number(amount.replace(",", "."));
    if (!Number.isFinite(major) || major <= 0) {
      notifyError("marketplaceCheckout.addMoney.invalidAmount");
      return;
    }
    try {
      await createDeposit({ amount_minor: toMinorUnits(major), currency });
      // On success the hook redirects the browser to Stripe; no further UI.
    } catch {
      notifyError("marketplaceCheckout.addMoney.failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("marketplaceCheckout.addMoney.title")}</DialogTitle>
          <DialogDescription>
            {t("marketplaceCheckout.addMoney.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="add-money-amount">
              {t("marketplaceCheckout.addMoney.amountLabel")}
            </Label>
            <Input
              id="add-money-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("marketplaceCheckout.addMoney.amountPlaceholder")}
              disabled={isCreating}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-money-currency">
              {t("marketplaceCheckout.addMoney.currencyLabel")}
            </Label>
            <Select
              value={currency}
              onValueChange={(v) => setCurrency(v as WalletCurrency)}
              disabled={isCreating}
            >
              <SelectTrigger id="add-money-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">
                  {t("marketplaceCheckout.addMoney.currencyEur")}
                </SelectItem>
                <SelectItem value="USD">
                  {t("marketplaceCheckout.addMoney.currencyUsd")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={handleContinue}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("marketplaceCheckout.addMoney.processing")}
              </>
            ) : (
              t("marketplaceCheckout.addMoney.continue")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
