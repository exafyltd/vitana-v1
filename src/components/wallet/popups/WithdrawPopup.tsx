import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
      toast({
        title: "Missing Information",
        description: "Please enter an amount and select a withdrawal method.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const method = withdrawalMethods.find(m => m.id === selectedMethod);
    const totalCost = amount + (method?.fee || 0);
    
    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount.",
        variant: "destructive",
      });
      return;
    }

    if (totalCost > usdBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You need $${totalCost.toFixed(2)} (including fees) but only have $${usdBalance.toFixed(2)}.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Simulate withdrawal processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update balance (subtract the total cost including fees)
      await updateBalance('USD', totalCost, 'subtract');
      
      toast({
        title: "Withdrawal Initiated",
        description: `$${amount.toFixed(2)} withdrawal to ${method?.name} has been initiated. ${method?.processingTime}`,
      });
      
      // Reset form and close
      setWithdrawAmount("");
      setSelectedMethod("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Withdrawal Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedMethodData = withdrawalMethods.find(m => m.id === selectedMethod);
  const withdrawAmountNum = parseFloat(withdrawAmount) || 0;
  const totalCost = withdrawAmountNum + (selectedMethodData?.fee || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDown className="h-5 w-5 text-blue-600" />
            Withdraw Funds
          </DialogTitle>
          <DialogDescription>
            Transfer money from your VITANA wallet to your bank account or card
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Available Balance */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available Balance</span>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-lg">${usdBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <Label className="text-sm font-medium">Quick Select</Label>
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
            <Label htmlFor="amount">Withdrawal Amount</Label>
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
            <Label>Withdrawal Method</Label>
            <Select value={selectedMethod} onValueChange={setSelectedMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select withdrawal method" />
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
                          <Badge variant="secondary" className="text-xs">
                            ${method.fee} fee
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
                <span>Processing time: {selectedMethodData.processingTime}</span>
              </div>
            )}
          </div>

          {/* Transaction Summary */}
          {withdrawAmountNum > 0 && selectedMethodData && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Withdrawal Amount</span>
                  <span>${withdrawAmountNum.toFixed(2)}</span>
                </div>
                {selectedMethodData.fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Processing Fee</span>
                    <span>${selectedMethodData.fee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Total Deducted</span>
                  <span>${totalCost.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleWithdraw}
            disabled={!withdrawAmount || !selectedMethod || isProcessing || totalCost > usdBalance}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ArrowDown className="h-4 w-4 mr-2" />
                Withdraw ${withdrawAmountNum.toFixed(2)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}