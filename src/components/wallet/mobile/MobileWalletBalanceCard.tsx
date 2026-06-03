import type { ComponentType, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, DollarSign, CreditCard, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MobileWalletBalanceCardProps {
  type: 'tokens' | 'cash' | 'credits';
  title: string;
  balance: string;
  subBalance?: string;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  isLoading?: boolean;
  onPress?: () => void;
  className?: string;
  accessory?: ReactNode;
  /** Overrides the glyph for the `cash` card (e.g. Euro vs DollarSign). */
  icon?: ComponentType<{ className?: string }>;
}

export function MobileWalletBalanceCard({
  type,
  title,
  balance,
  subBalance,
  change,
  changeType = 'neutral',
  isLoading = false,
  onPress,
  className = "",
  accessory,
  icon
}: MobileWalletBalanceCardProps) {
  const getIcon = () => {
    switch (type) {
      case 'tokens':
        return <Coins className="h-5 w-5 text-amber-500" />;
      case 'cash': {
        const CashIcon = icon ?? DollarSign;
        return <CashIcon className="h-5 w-5 text-emerald-500" />;
      }
      case 'credits':
        return <CreditCard className="h-5 w-5 text-purple-500" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'tokens':
        return 'bg-amber-100 dark:bg-amber-900/30';
      case 'cash':
        return 'bg-emerald-100 dark:bg-emerald-900/30';
      case 'credits':
        return 'bg-purple-100 dark:bg-purple-900/30';
    }
  };

  const getChangeColor = () => {
    switch (changeType) {
      case 'increase':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'decrease':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-5 w-5 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`${onPress ? 'cursor-pointer active:scale-[0.98]' : ''} transition-transform ${className}`}
      onClick={onPress}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getIconBg()}`}>
            {getIcon()}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground truncate">{title}</p>
              {accessory}
            </div>
            <p className="text-lg font-semibold truncate">{balance}</p>
            {(subBalance || change) && (
              <div className="flex items-center gap-2 mt-0.5">
                {subBalance && (
                  <span className="text-xs text-muted-foreground">{subBalance}</span>
                )}
                {change && (
                  <span className={`text-xs font-medium ${getChangeColor()}`}>{change}</span>
                )}
              </div>
            )}
          </div>
          
          {/* Chevron - only shown when interactive */}
          {onPress && (
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
