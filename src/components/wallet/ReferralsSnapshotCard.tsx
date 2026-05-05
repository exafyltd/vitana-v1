import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Share2, Gift } from "lucide-react";
import { RewardDot } from "@/components/ui/reward-dot";
import { t } from '@/lib/i18n-toast';

export function ReferralsSnapshotCard() {
  return (
    <Card className="relative">
      <RewardDot points={25} description="Refer friends to earn" />
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-500" />
          {t('screens.wallet.referrals')}
        </CardTitle>
        <CardDescription>{t('screens.wallet.shareEarnTogether')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold text-indigo-600">12</div>
            <div className="text-xs text-muted-foreground">{t('screens.wallet.referred')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">8</div>
            <div className="text-xs text-muted-foreground">{t('screens.wallet.active')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">247</div>
            <div className="text-xs text-muted-foreground">{t('screens.wallet.vtnEarned')}</div>
          </div>
        </div>
        
        <div className="text-center py-2 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">{t('screens.wallet.nextRewardAt')}</div>
          <div className="font-semibold">{t('screens.wallet.text15Referrals')}</div>
          <div className="text-xs text-green-600">{t('screens.wallet.text500VtnBonus')}</div>
        </div>
        
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
            <Share2 className="h-4 w-4 mr-1" />
            {t('screens.wallet.shareLink')}
          </Button>
          <Button size="sm" variant="outline">
            <Gift className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}