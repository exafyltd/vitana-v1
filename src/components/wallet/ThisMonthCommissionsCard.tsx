import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Eye } from "lucide-react";
import { RewardDot } from "@/components/ui/reward-dot";
import { t } from '@/lib/i18n-toast';

export function ThisMonthCommissionsCard() {
  return (
    <Card className="relative">
      <RewardDot points={50} description="Earn from referral commissions" />
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          {t('screens.wallet.thisMonthCommissions')}
        </CardTitle>
        <CardDescription>{t('screens.wallet.january2024Earnings')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-2">
          <div className="text-3xl font-bold text-green-600 mb-1">$247.80</div>
          <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {t('screens.wallet.text18VsLastMonth')}
          </div>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>{t('screens.wallet.referralBonuses')}</span>
            <span className="font-medium text-green-600">$184.50</span>
          </div>
          <div className="flex justify-between">
            <span>{t('screens.wallet.dataSharing')}</span>
            <span className="font-medium text-green-600">$63.30</span>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground mb-1">{t('screens.wallet.progressNextTier')}</div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{width: '68%'}}></div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">{t('screens.wallet.text7531000Monthly')}</div>
        </div>
        
        <Button variant="outline" size="sm" className="w-full">
          <Eye className="h-4 w-4 mr-2" />
          {t('screens.wallet.viewDetails')}
        </Button>
      </CardContent>
    </Card>
  );
}