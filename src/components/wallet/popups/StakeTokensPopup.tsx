import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Coins, TrendingUp, Shield, Loader2 } from "lucide-react";
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { isIAPRestricted } from '@/lib/appilix';
import { notify, notifyError } from '@/lib/i18n-toast';

interface StakeTokensPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StakeTokensPopup({ open, onOpenChange }: StakeTokensPopupProps) {
  const { getBalance, updateBalance } = useWallet();
  const { toast } = useToast();
  const [stakeAmount, setStakeAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (isIAPRestricted()) return null;

  const vtnaBalance = getBalance('VTNA') || 0;
  const stakingPeriods = [
    { period: '30 days', apy: '8%', multiplier: 1.2 },
    { period: '90 days', apy: '12%', multiplier: 1.5 },
    { period: '180 days', apy: '15%', multiplier: 1.8 },
    { period: '365 days', apy: '20%', multiplier: 2.0 }
  ];

  const handleStake = async (period: string, apy: string) => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      notifyError('toasts.wallet.invalidAmount2', 'toasts.wallet.pleaseEnterValidStakingAmount');
      return;
    }

    if (parseFloat(stakeAmount) > vtnaBalance) {
      notifyError('toasts.wallet.insufficientBalance', 'toasts.wallet.youDonTHaveEnoughVtna');
      return;
    }

    setLoading(true);
    
    try {
      // Simulate staking by deducting from balance
      await updateBalance('VTNA', parseFloat(stakeAmount), 'subtract');
      
      notify('toasts.wallet.tokensStakedSuccessfully');
      
      onOpenChange(false);
      setStakeAmount('');
    } catch (error) {
      notifyError('toasts.wallet.stakingFailed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-purple-600" />
            Stake VTNA Tokens
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Balance */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available VTNA Balance</span>
              <span className="font-semibold text-purple-700">{vtnaBalance.toLocaleString()} VTNA</span>
            </div>
          </div>

          {/* Stake Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="stakeAmount">Amount to Stake</Label>
            <Input
              id="stakeAmount"
              type="number"
              placeholder="Enter VTNA amount"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              max={vtnaBalance}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStakeAmount((vtnaBalance * 0.25).toString())}
              >
                25%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStakeAmount((vtnaBalance * 0.5).toString())}
              >
                50%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStakeAmount((vtnaBalance * 0.75).toString())}
              >
                75%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStakeAmount(vtnaBalance.toString())}
              >
                MAX
              </Button>
            </div>
          </div>

          <Separator />

          {/* Staking Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Choose Staking Period</h4>
            {stakingPeriods.map((option, index) => (
              <Button
                key={index}
                variant="outline"
                className="justify-between h-auto p-4 w-full"
                onClick={() => handleStake(option.period, option.apy)}
                disabled={loading || !stakeAmount}
              >
                <div className="flex items-center gap-3">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 text-purple-600" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">{option.period}</div>
                    <div className="text-xs text-muted-foreground">Lock period</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="font-semibold text-green-600">{option.apy}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">APY</div>
                </div>
              </Button>
            ))}
          </div>

          {/* Benefits Info */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Staking Benefits</span>
            </div>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>• Earn passive rewards through staking</li>
              <li>• Participate in governance voting</li>
              <li>• Access exclusive community features</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}