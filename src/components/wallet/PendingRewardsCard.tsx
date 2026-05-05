import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Gift } from "lucide-react";
import { RewardDot } from "@/components/ui/reward-dot";
import { t } from '@/lib/i18n-toast';

export function PendingRewardsCard() {
  return (
    <Card className="relative">
      <RewardDot points={15} description="Claim pending rewards" />
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Pending Rewards
        </CardTitle>
        <CardDescription>{t('screens.wallet.readyClaim')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-2">
          <div className="text-3xl font-bold text-amber-600 mb-1">{t('screens.wallet.text487Vtna')}</div>
          <div className="text-sm text-muted-foreground">{t('screens.wallet.text2435Value')}</div>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>{t('screens.wallet.healthTracking')}</span>
            <span className="text-amber-600">{t('screens.wallet.text125Vtna')}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('screens.wallet.dataSharing')}</span>
            <span className="text-amber-600">{t('screens.wallet.text200Vtna')}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('screens.wallet.communityEngagement')}</span>
            <span className="text-amber-600">{t('screens.wallet.text162Vtna')}</span>
          </div>
        </div>
        
        <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
          <Gift className="h-4 w-4 mr-2" />
          Claim All Rewards
        </Button>
      </CardContent>
    </Card>
  );
}