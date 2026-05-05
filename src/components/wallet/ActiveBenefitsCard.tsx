import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RewardDot } from "@/components/ui/reward-dot";
import { Shield, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { t } from '@/lib/i18n-toast';

export function ActiveBenefitsCard() {
  return (
    <Card className="relative">
      <RewardDot 
        points={7} 
        description="Maximize benefits for additional value"
        position="top-right"
        size="md"
      />
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          Active Benefits
        </CardTitle>
        <CardDescription>{t('screens.wallet.currentSubscriptionPerks')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('screens.wallet.premiumHealthAi')}</span>
            <Badge variant="secondary" className="bg-green-100 text-green-700">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('screens.wallet.dataVaultPro')}</span>
            <Badge variant="secondary" className="bg-green-100 text-green-700">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('screens.wallet.prioritySupport')}</span>
            <Badge variant="secondary" className="bg-green-100 text-green-700">Active</Badge>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <div className="text-sm text-muted-foreground mb-2">{t('screens.wallet.monthlyValue')}</div>
          <div className="text-lg font-semibold text-blue-600">{t('screens.wallet.text12750month')}</div>
        </div>
        
        <Button variant="outline" className="w-full">
          <Settings className="h-4 w-4 mr-2" />
          Manage Benefits
        </Button>
      </CardContent>
    </Card>
  );
}