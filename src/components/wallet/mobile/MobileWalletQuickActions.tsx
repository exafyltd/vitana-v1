import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Send, ArrowUpDown, ArrowUpRight, CreditCard } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { isIAPRestricted } from "@/lib/appilix";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

// Distinct pastel tile per action, matching the wallet redesign mock.
const TILE_STYLES: Record<string, string> = {
  'add-funds': 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
  'send': 'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300',
  'exchange': 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400',
  'withdraw': 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400',
};

interface MobileWalletQuickActionsProps {
  onAddFunds: () => void;
  onSend: () => void;
  onExchange: () => void;
  onWithdraw: () => void;
  onBuyCredits: () => void;
  className?: string;
}

export function MobileWalletQuickActions({
  onAddFunds,
  onSend,
  onExchange,
  onWithdraw,
  onBuyCredits,
  className = ""
}: MobileWalletQuickActionsProps) {
  const { translate } = useTranslation();
  const restricted = isIAPRestricted();
  const restrictedIds = ['add-funds', 'buy-credits', 'exchange', 'withdraw'];
  
  const allActions: QuickAction[] = [
    {
      id: 'add-funds',
      label: translate('walletActions.addFunds'),
      icon: <PlusCircle className="h-6 w-6" />,
      onClick: onAddFunds
    },
    {
      id: 'send',
      label: translate('walletActions.send'),
      icon: <Send className="h-6 w-6" />,
      onClick: onSend
    },
    {
      id: 'exchange',
      label: translate('walletActions.exchange'),
      icon: <ArrowUpDown className="h-6 w-6" />,
      onClick: onExchange
    },
    {
      id: 'withdraw',
      label: translate('walletActions.withdraw'),
      icon: <ArrowUpRight className="h-6 w-6" />,
      onClick: onWithdraw
    }
  ];

  const allSecondaryActions: QuickAction[] = [
    {
      id: 'buy-credits',
      label: translate('walletActions.buyCredits'),
      icon: <CreditCard className="h-4 w-4" />,
      onClick: onBuyCredits
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
                flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl
                transition-all active:scale-95
                ${TILE_STYLES[action.id] ?? 'bg-muted/60 hover:bg-muted text-foreground'}
              `}
            >
              {action.icon}
              <span className="text-sm font-semibold text-foreground">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Secondary Actions - Full-width outlined buttons */}
        <div className="space-y-2">
          {secondaryActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              onClick={action.onClick}
              className="w-full h-12 rounded-xl gap-2 border-2 border-primary text-primary hover:bg-primary/5"
            >
              {action.icon}
              <span className="text-sm font-semibold">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
