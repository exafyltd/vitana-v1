import React from 'react';
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
  Zap
} from "lucide-react";

interface WalletMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletMasterActionPopup({ open, onOpenChange }: WalletMasterActionPopupProps) {
  const handleAction = (actionType: string) => {
    console.log(`Wallet action: ${actionType}`);
    // Here you would implement the actual action logic
    onOpenChange(false);
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
              >
                <CreditCard className="h-4 w-4" />
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
              >
                <Coins className="h-4 w-4" />
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
              >
                <Send className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Transfer / Send</div>
                  <div className="text-xs text-muted-foreground">Send funds to another user</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start gap-3 h-auto py-3"
                onClick={() => handleAction('convert-rewards')}
              >
                <ArrowUpDown className="h-4 w-4" />
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
              >
                <Zap className="h-4 w-4 text-purple-600" />
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
              >
                <Banknote className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Withdraw / Cash Out</div>
                  <div className="text-xs text-muted-foreground">Transfer funds to bank account</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start gap-3 h-auto py-3"
                onClick={() => handleAction('manage-subscriptions')}
              >
                <Settings className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Manage Subscriptions</div>
                  <div className="text-xs text-muted-foreground">View and edit your plans</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start gap-3 h-auto py-3"
                onClick={() => handleAction('claim-rewards')}
              >
                <Gift className="h-4 w-4" />
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