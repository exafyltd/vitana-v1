import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Settings, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { t } from '@/lib/i18n-toast';

export function SubscriptionsOverviewCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-500" />
          Subscriptions
        </CardTitle>
        <CardDescription>{t('screens.wallet.activePlansBilling')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <div>
              <div className="font-medium text-sm">{t('screens.wallet.healthPro')}</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.text2999month')}</div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700">Active</Badge>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <div>
              <div className="font-medium text-sm">{t('screens.wallet.dataVault')}</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.text999month')}</div>
            </div>
            <Badge variant="outline">Paused</Badge>
          </div>
        </div>
        
        <div className="text-center py-2 border-t">
          <div className="text-sm text-muted-foreground">{t('screens.wallet.nextBilling')}</div>
          <div className="font-medium">{t('screens.wallet.february152024')}</div>
          <div className="text-sm text-blue-600">$29.99</div>
        </div>
        
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            <Settings className="h-4 w-4 mr-1" />
            Manage
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            <Plus className="h-4 w-4 mr-1" />
            Add Plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}