import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Wallet, ArrowRight, Loader2, CheckCircle } from "lucide-react";

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
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="mx-auto h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-2">
            <Wallet className="h-7 w-7 text-accent" />
          </div>
          <AlertDialogTitle className="text-center">
            Transfer to Wallet
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-3">
            <p>Transfer your pending reseller commissions to your VITANA Wallet.</p>
            
            <div className="flex items-center justify-center gap-2 py-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Pending</p>
                <p className="text-xl font-semibold text-foreground">
                  {formatCurrency(pendingAmount)}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Wallet</p>
                <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                  <Wallet className="h-3.5 w-3.5 text-accent" />
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              This will credit your earnings instantly to your wallet balance.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isLoading} className="rounded-full">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
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
                Transferring...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Transfer {formatCurrency(pendingAmount)}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
