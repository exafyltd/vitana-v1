import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCurrentExchangeRates, formatCurrency } from '@/lib/exchangeRates';
import { cn } from '@/lib/utils';
import { isIAPRestricted } from '@/lib/appilix';
import { t } from '@/lib/i18n-toast';

interface ExchangeRateDisplayProps {
  compact?: boolean;
  className?: string;
}

export function ExchangeRateDisplay({ compact = false, className }: ExchangeRateDisplayProps) {
  // Hide exchange rates on iOS — prototype feature only
  if (isIAPRestricted()) return null;
  const rates = getCurrentExchangeRates();
  
  // Show the key rate: USD->Credits (VTNA merged into Credits, no separate token rate)
  const keyRates = rates.filter(rate =>
    rate.from === 'USD' && rate.to === 'CREDITS'
  );

  const getTrendIcon = (trend: string, change: number) => {
    if (trend === 'up' || change > 0) {
      return <TrendingUp className="w-3 h-3 text-green-500" />;
    } else if (trend === 'down' || change < 0) {
      return <TrendingDown className="w-3 h-3 text-red-500" />;
    }
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  const getTrendColor = (trend: string, change: number) => {
    if (trend === 'up' || change > 0) return 'text-green-600';
    if (trend === 'down' || change < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-4 text-xs", className)}>
        {keyRates.map((rate, index) => (
          <div key={index} className="flex items-center gap-1">
            <span className="text-muted-foreground">
              1 {rate.from} = {rate.rate.toFixed(2)} {rate.to}
            </span>
            {getTrendIcon(rate.trend, rate.change24h)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className={cn("border-dashed bg-gradient-to-r from-blue-50/50 to-purple-50/50", className)}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-muted-foreground">{t('screens.wallet.liveExchangeRates')}</h4>
          <Badge variant="outline" className="text-xs bg-white">
            {t('screens.wallet.updatedNow')}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {keyRates.map((rate, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {rate.from} → {rate.to}
                </span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(rate.trend, rate.change24h)}
                  <span className={cn("text-xs font-medium", getTrendColor(rate.trend, rate.change24h))}>
                    {Math.abs(rate.change24h)}%
                  </span>
                </div>
              </div>
              
              <div className="text-sm font-semibold">
                1 {rate.from} = {rate.rate.toFixed(2)} {rate.to}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}