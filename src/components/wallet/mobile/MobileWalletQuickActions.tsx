import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Send, ArrowUpDown, ArrowUpRight, CreditCard, Coins } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { isIAPRestricted } from "@/lib/appilix";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'primary';
}

interface MobileWalletQuickActionsProps {
  onAddFunds: () => void;
  onSend: () => void;
  onExchange: () => void;
  onWithdraw: () => void;
  onBuyCredits: () => void;
  onStakeTokens: () => void;
  className?: string;
}

export function MobileWalletQuickActions({
  onAddFunds,
  onSend,
  onExchange,
  onWithdraw,
  onBuyCredits,
  onStakeTokens,
  className = ""
}: MobileWalletQuickActionsProps) {
  const { translate } = useTranslation();
  const restricted = isIAPRestricted();
  const restrictedIds = ['add-funds', 'buy-credits', 'buy-tokens'];
  
  const allActions: QuickAction[] = [
    {
      id: 'add-funds',
      label: translate('walletActions.addFunds'),
      icon: <Plus className="h-5 w-5" />,
      onClick: onAddFunds,
      variant: 'primary'
    },
    {
      id: 'send',
      label: translate('walletActions.send'),
      icon: <Send className="h-5 w-5" />,
      onClick: onSend
    },
    {
      id: 'exchange',
      label: translate('walletActions.exchange'),
      icon: <ArrowUpDown className="h-5 w-5" />,
      onClick: onExchange
    },
    {
      id: 'withdraw',
      label: translate('walletActions.withdraw'),
      icon: <ArrowUpRight className="h-5 w-5" />,
      onClick: onWithdraw
    }
  ];

  const allSecondaryActions: QuickAction[] = [
    {
      id: 'buy-credits',
      label: translate('walletActions.buyCredits'),
      icon: <CreditCard className="h-4 w-4" />,
      onClick: onBuyCredits
    },
    {
      id: 'stake-tokens',
      label: translate('walletActions.stakeTokens'),
      icon: <Coins className="h-4 w-4" />,
      onClick: onStakeTokens
    }
  ];

  const actions = restricted ? allActions.filter(a => !restrictedIds.includes(a.id)) : allActions;
  const secondaryActions = restricted ? allSecondaryActions.filter(a => !restrictedIds.includes(a.id)) : allSecondaryActions;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{translate('walletActions.title')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Primary Actions - Grid */}
        <div className={`grid gap-2 ${actions.length <= 2 ? 'grid-cols-2' : actions.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`
                flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl
                transition-all active:scale-95
                ${action.variant === 'primary' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted/60 hover:bg-muted text-foreground'
                }
              `}
            >
              {action.icon}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
        
        {/* Secondary Actions - Horizontal Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {secondaryActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className="h-9 px-3 rounded-full gap-1.5 shrink-0"
            >
              {action.icon}
              <span className="text-sm">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
