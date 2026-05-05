import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, ArrowUpDown, Send } from "lucide-react";
import { RewardDot } from "@/components/ui/reward-dot";
import { t } from '@/lib/i18n-toast';

export function RewardsBalanceCard() {
  return (
    <Card className="relative">
      <RewardDot points={10} description="Convert or send VTNA" />
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Coins className="h-5 w-5 text-purple-500" />
          {t('screens.wallet.vtnaBalance')}
        </CardTitle>
        <CardDescription>{t('screens.wallet.vitanaNetworkTokens')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-2">
          <div className="text-3xl font-bold text-purple-600 mb-1">{t('screens.wallet.text2847Vtna')}</div>
          <div className="text-sm text-muted-foreground">{t('screens.wallet.text14235Usd')}</div>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1">
            <span>{t('screens.wallet.available')}</span>
            <span className="font-medium">{t('screens.wallet.text2847Vtna')}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>{t('screens.wallet.staked')}</span>
            <span className="font-medium text-blue-600">{t('screens.wallet.text500Vtna')}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>{t('screens.wallet.locked')}</span>
            <span className="font-medium text-orange-600">{t('screens.wallet.text150Vtna')}</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            <ArrowUpDown className="h-4 w-4 mr-1" />
            {t('screens.wallet.convert')}
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            <Send className="h-4 w-4 mr-1" />
            {t('screens.wallet.send')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}