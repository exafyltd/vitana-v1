/**
 * Marketplace money loop — gateway commerce wallet balance card.
 *
 * Compact card showing the EUR/USD `wallet_accounts` balances from the NEW
 * gateway commerce-wallet rail, with an "Add money" button that opens the
 * AddMoneyDialog. Used on the cart / checkout surface only.
 *
 * ADDITIVE — does NOT replace the legacy WalletBalanceCard or touch the
 * legacy useWallet / user_wallets rail.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Wallet } from "lucide-react";
import { useWalletBalance } from "@/hooks/useWalletGateway";
import { AddMoneyDialog } from "@/components/wallet/AddMoneyDialog";
import { formatMoneyMinor } from "@/lib/format-money";
import { t } from "@/lib/i18n-toast";

export function GatewayWalletBalanceCard() {
  const { accounts, isLoading } = useWalletBalance();
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Wallet className="h-4 w-4" />
            {t("marketplaceCheckout.balance.title")}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {isLoading ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("marketplaceCheckout.balance.loading")}
              </span>
            ) : accounts.length === 0 ? (
              <span>{t("marketplaceCheckout.balance.empty")}</span>
            ) : (
              <span className="tabular-nums">
                {accounts
                  .map((a) => formatMoneyMinor(a.balance_minor, a.currency))
                  .join(" · ")}
              </span>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAddMoneyOpen(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t("marketplaceCheckout.balance.addMoney")}
        </Button>
      </CardContent>

      <AddMoneyDialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen} />
    </Card>
  );
}
