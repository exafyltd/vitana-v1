import { useState } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, CreditCard, Building2, Clock, DollarSign, Loader2 } from "lucide-react";
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { isIAPRestricted } from '@/lib/appilix';
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface WithdrawPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WithdrawPopup({ open, onOpenChange }: WithdrawPopupProps) {
  // Hide withdraw on iOS — prototype feature only
  if (isIAPRestricted()) return null;
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { getBalance, updateBalance } = useWallet();
  const { toast } = useToast();
  
  const usdBalance = getBalance('USD') || 0;
  
  // Quick withdrawal amounts
  const quickAmounts = [50, 100, 250, 500];
  
  // Withdrawal methods
  const withdrawalMethods = [
    {
      id: "bank_transfer",
      name: "Bank Transfer",
      icon: Building2,
      processingTime: "1-3 business days",
      fee: 0
    },
    {
      id: "debit_card",
      name: "Debit Card",
      icon: CreditCard,
      processingTime: "Instant",
      fee: 2.50
    }
  ];

  const handleQuickAmount = (amount: number) => {
    setWithdrawAmount(amount.toString());
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !selectedMethod) {
      notifyError('toasts.wallet.missingInformation', 'toasts.wallet.pleaseEnterAmountSelectWithdrawalMethod');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const method = withdrawalMethods.find(m => m.id === selectedMethod);
    const totalCost = amount + (method?.fee || 0);
    
    if (amount <= 0) {
      notifyError('toasts.wallet.invalidAmount', 'toasts.wallet.pleaseEnterValidWithdrawalAmount');
      return;
    }

    if (totalCost > usdBalance) {
      notifyError('toasts.wallet.insufficientBalance2');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Simulate withdrawal processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update balance (subtract the total cost including fees)
      await updateBalance('USD', totalCost, 'subtract', 'withdrawal', `Withdrawal via ${method?.name ?? selectedMethod}`);
      
      notify('toasts.wallet.withdrawalInitiated2');
      
      // Reset form and close
      setWithdrawAmount("");
      setSelectedMethod("");
      onOpenChange(false);
    } catch (error) {
      notifyError('toasts.wallet.withdrawalFailed', 'toasts.wallet.somethingWentWrongPleaseTryAgain');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedMethodData = withdrawalMethods.find(m => m.id === selectedMethod);
  const withdrawAmountNum = parseFloat(withdrawAmount) || 0;
  const totalCost = withdrawAmountNum + (selectedMethodData?.fee || 0);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md" fullscreenOnMobile>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <ArrowDown className="h-5 w-5 text-blue-600" />
            {t('screens.wallet.withdrawFunds')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{t('screens.wallet.transferMoneyFromYourVitanaWallet')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-6">
          {/* Available Balance */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('screens.wallet.availableBalance')}</span>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-lg">${usdBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <Label className="text-sm font-medium">{t('screens.wallet.quickSelect')}</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(amount)}
                  disabled={amount > usdBalance}
                  className="text-xs"
                >
                  ${amount}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <Label htmlFor="amount">{t('screens.wallet.withdrawalAmount')}</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              min="0"
              max={usdBalance}
              step="0.01"
            />
          </div>

          {/* Withdrawal Method */}
          <div>
            <Label>{t('screens.wallet.withdrawalMethod')}</Label>
            <Select value={selectedMethod} onValueChange={setSelectedMethod}>
              <SelectTrigger>
                <SelectValue placeholder={t('screens.wallet.selectWithdrawalMethod')} />
              </SelectTrigger>
              <SelectContent>
                {withdrawalMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <SelectItem key={method.id} value={method.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{method.name}</span>
                        {method.fee > 0 && (
                          <Badge variant="secondary" className="text-xs">{t('screens.wallet.feeFee', { fee: method.fee })}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            {selectedMethodData && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{t('screens.wallet.processingTimeProcessingtime', { processingTime: selectedMethodData.processingTime })}</span>
              </div>
            )}
          </div>

          {/* Transaction Summary */}
          {withdrawAmountNum > 0 && selectedMethodData && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('screens.wallet.withdrawalAmount')}</span>
                  <span>${withdrawAmountNum.toFixed(2)}</span>
                </div>
                {selectedMethodData.fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>{t('screens.wallet.processingFee')}</span>
                    <span>${selectedMethodData.fee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>{t('screens.wallet.totalDeducted')}</span>
                  <span>${totalCost.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('screens.wallet.cancel')}
          </Button>
          <Button
            onClick={handleWithdraw}
            disabled={!withdrawAmount || !selectedMethod || isProcessing || totalCost > usdBalance}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('screens.wallet.processing')}
              </>
            ) : (
              <>
                <ArrowDown className="h-4 w-4 mr-2" />{t('screens.wallet.withdrawValue0', { value0: withdrawAmountNum.toFixed(2) })}</>
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}