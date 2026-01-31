import { useState } from "react";
import {
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
} from "@/components/ui/responsive-confirm-dialog";
import { Wallet, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface TransferToWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingAmount: number;
  onConfirm: () => void;
  isLoading: boolean;
}

export function TransferToWalletDialog({
  open,
  onOpenChange,
  pendingAmount,
  onConfirm,
  isLoading,
}: TransferToWalletDialogProps) {
  const { translate } = useTranslation();
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <ResponsiveConfirmDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveConfirmDialogContent className="max-w-sm">
        <ResponsiveConfirmDialogHeader>
          <div className="mx-auto h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-2">
            <Wallet className="h-7 w-7 text-accent" />
          </div>
          <ResponsiveConfirmDialogTitle className="text-center">
            {translate('business.transfer.title')}
          </ResponsiveConfirmDialogTitle>
          <ResponsiveConfirmDialogDescription className="text-center space-y-3">
            <p>{translate('business.transfer.description')}</p>
            
            <div className="flex items-center justify-center gap-2 py-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">{translate('business.transfer.pending')}</p>
                <p className="text-xl font-semibold text-foreground">
                  {formatCurrency(pendingAmount)}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">{translate('business.transfer.wallet')}</p>
                <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                  <Wallet className="h-3.5 w-3.5 text-accent" />
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {translate('business.transfer.instantCredit')}
            </p>
          </ResponsiveConfirmDialogDescription>
        </ResponsiveConfirmDialogHeader>
        <ResponsiveConfirmDialogFooter className="flex-col sm:flex-row gap-2">
          <ResponsiveConfirmDialogCancel disabled={isLoading} className="rounded-full">
            {translate('common.cancel')}
          </ResponsiveConfirmDialogCancel>
          <ResponsiveConfirmDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading || pendingAmount <= 0}
            className="rounded-full bg-accent hover:bg-accent/90 gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {translate('business.transfer.transferring')}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                {translate('business.transfer.transfer')} {formatCurrency(pendingAmount)}
              </>
            )}
          </ResponsiveConfirmDialogAction>
        </ResponsiveConfirmDialogFooter>
      </ResponsiveConfirmDialogContent>
    </ResponsiveConfirmDialog>
  );
}
