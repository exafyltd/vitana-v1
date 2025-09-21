import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Coins,
  Send,
  ArrowUpDown,
  Banknote,
  Settings,
  Gift,
  Plus,
  Wallet,
  Zap,
  Loader2
} from "lucide-react";
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';

interface WalletMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletMasterActionPopup({ open, onOpenChange }: WalletMasterActionPopupProps) {
  const { updateBalance, exchangeCurrency, transferFunds } = useWallet();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (actionType: string) => {
    setLoading(actionType);
    
    try {
      switch (actionType) {
        case 'buy-credits':
          await updateBalance('CREDITS', 100, 'add');
          toast({
            title: '✅ Credits Purchased!',
            description: 'Added 100 CREDITS to your wallet',
            duration: 3000
          });
          break;

        case 'buy-tokens':
          await updateBalance('VTN', 50, 'add');
          toast({
            title: '✅ Tokens Purchased!',
            description: 'Added 50 VTN tokens to your wallet',
            duration: 3000
          });
          break;

        case 'convert-rewards':
          await exchangeCurrency('VTN', 'CREDITS', 10, 1.05); // +5% bonus
          toast({
            title: '✅ Rewards Converted!',
            description: 'Converted VTN rewards to CREDITS with 5% bonus',
            duration: 3000
          });
          break;

        case 'exchange-and-send':
          await exchangeCurrency('USD', 'VTN', 25, 2.5);
          toast({
            title: '✅ Currency Exchanged!',
            description: 'Converted USD to VTN at current rate',
            duration: 3000
          });
          break;

        case 'withdraw-cashout':
          await updateBalance('USD', 50, 'subtract');
          toast({
            title: '✅ Withdrawal Initiated!',
            description: 'Withdrawal request submitted for processing',
            duration: 3000
          });
          break;

        case 'claim-rewards':
          await updateBalance('VTN', 25, 'add');
          toast({
            title: '✅ Rewards Claimed!',
            description: 'Added 25 VTN rewards to your wallet',
            duration: 3000
          });
          break;

        case 'transfer-send':
        case 'manage-subscriptions':
          toast({
            title: '🚧 Coming Soon',
            description: 'This feature will be available in the next update',
            duration: 3000
          });
          break;

        default:
          console.log(`Unhandled wallet action: ${actionType}`);
      }
    } catch (error) {
      console.error('Wallet action error:', error);
    } finally {
      setLoading(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Wallet Actions
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4">
          {/* Buy & Add Section */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Purchase & Add Funds</h4>
            <div className="grid gap-2">
              <Button 
                variant="outline" 
                className="justify-start gap-3 h-auto py-3"
                onClick={() => handleAction('buy-credits')}
                disabled={loading === 'buy-credits'}
              >
                {loading === 'buy-credits' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                <div className="text-left">
                  <div className="font-medium">Buy Credits</div>
                  <div className="text-xs text-muted-foreground">Add credits to your account</div>
                </div>
                <Badge variant="secondary" className="ml-auto">Popular</Badge>
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start gap-3 h-auto py-3"
                onClick={() => handleAction('buy-tokens')}
                disabled={loading === 'buy-tokens'}
              >
                {loading === 'buy-tokens' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Coins className="h-4 w-4" />
                )}
                <div className="text-left">
                  <div className="font-medium">Buy Tokens</div>
                  <div className="text-xs text-muted-foreground">Purchase VTN tokens</div>
                </div>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Transfer & Convert Section */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Transfer & Convert</h4>
            <div className="grid gap-2">
              <Button 
                variant="outline" 
                className="justify-start gap-3 h-auto py-3"
                onClick={() => handleAction('transfer-send')}
                disabled={loading === 'transfer-send'}
              >
                {loading === 'transfer-send' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <div className="text-left">
                  <div className="font-medium">Transfer / Send</div>
                  <div className="text-xs text-muted-foreground">Send funds to another user</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start gap-3 h-auto py-3"
                onClick={() => handleAction('convert-rewards')}
                disabled={loading === 'convert-rewards'}
              >
                {loading === 'convert-rewards' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpDown className="h-4 w-4" />
                )}
                <div className="text-left">
                  <div className="font-medium">Convert Rewards → Credits</div>
                  <div className="text-xs text-muted-foreground">Convert earned rewards to credits</div>
                </div>
                <Badge variant="secondary" className="ml-auto">+5%</Badge>
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start gap-3 h-auto py-3 bg-gradient-to-r from-purple-50/30 to-blue-50/30 border-purple-200/50"
                onClick={() => handleAction('exchange-and-send')}
                disabled={loading === 'exchange-and-send'}
              >
                {loading === 'exchange-and-send' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                ) : (
                  <Zap className="h-4 w-4 text-purple-600" />
                )}
                <div className="text-left">
                  <div className="font-medium text-purple-700">Exchange & Send</div>
                  <div className="text-xs text-muted-foreground">Convert currency and send in one step</div>
                </div>
                <Badge variant="secondary" className="ml-auto bg-purple-100 text-purple-700">Quick</Badge>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Withdraw & Manage Section */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Withdraw & Manage</h4>
            <div className="grid gap-2">
              <Button 
                variant="outline" 
                className="justify-start gap-3 h-auto py-3"
                onClick={() => handleAction('withdraw-cashout')}
                disabled={loading === 'withdraw-cashout'}
              >
                {loading === 'withdraw-cashout' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Banknote className="h-4 w-4" />
                )}
                <div className="text-left">
                  <div className="font-medium">Withdraw / Cash Out</div>
                  <div className="text-xs text-muted-foreground">Transfer funds to bank account</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start gap-3 h-auto py-3"
                onClick={() => handleAction('manage-subscriptions')}
                disabled={loading === 'manage-subscriptions'}
              >
                {loading === 'manage-subscriptions' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Settings className="h-4 w-4" />
                )}
                <div className="text-left">
                  <div className="font-medium">Manage Subscriptions</div>
                  <div className="text-xs text-muted-foreground">View and edit your plans</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start gap-3 h-auto py-3"
                onClick={() => handleAction('claim-rewards')}
                disabled={loading === 'claim-rewards'}
              >
                {loading === 'claim-rewards' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Gift className="h-4 w-4" />
                )}
                <div className="text-left">
                  <div className="font-medium">Claim Rewards</div>
                  <div className="text-xs text-muted-foreground">Claim your pending rewards</div>
                </div>
                <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">Ready</Badge>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}