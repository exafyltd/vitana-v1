import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RewardDot } from "@/components/ui/reward-dot";
import { Activity, TrendingUp, AlertTriangle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { t } from '@/lib/i18n-toast';

export function EconomyHealthCard() {
  return (
    <Card className="relative">
      <RewardDot 
        points={4} 
        description="Monitor economy health for market insights"
        position="top-right"
        size="md"
      />
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-500" />
          {t('screens.wallet.economyHealth')}
        </CardTitle>
        <CardDescription>{t('screens.wallet.vtnaEcosystemStatus')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('screens.wallet.systemStatus')}</span>
          <Badge className="bg-green-100 text-green-700">{t('screens.wallet.healthy')}</Badge>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span>{t('screens.wallet.vtnaBurnRate')}</span>
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="h-3 w-3" />
              <span className="font-medium">2.4%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span>{t('screens.wallet.dailyActiveUsers')}</span>
            <span className="font-medium">847.2K</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>{t('screens.wallet.totalVtnaSupply')}</span>
            <span className="font-medium">{t('screens.wallet.text124mVtna')}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>{t('screens.wallet.marketCap')}</span>
            <span className="font-medium">{t('screens.wallet.text28mUsd')}</span>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex items-start gap-2 p-2 bg-amber-50 rounded text-xs">
            <AlertTriangle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
            <span className="text-amber-700">{t('screens.wallet.feeBurnsHelpMaintainTokenValue')}</span>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" className="w-full text-xs">
          <ExternalLink className="h-3 w-3 mr-1" />
          {t('screens.wallet.viewTokenomics')}
        </Button>
      </CardContent>
    </Card>
  );
}