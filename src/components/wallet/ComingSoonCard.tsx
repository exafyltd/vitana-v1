import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RewardDot } from "@/components/ui/reward-dot";
import { Sparkles, Bell, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { t } from '@/lib/i18n-toast';

export function ComingSoonCard() {
  return (
    <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 relative">
      <RewardDot 
        points={2} 
        description="Stay informed about new features"
        position="top-right"
        size="md"
      />
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          {t('screens.wallet.comingSoon')}
        </CardTitle>
        <CardDescription>{t('screens.wallet.excitingNewFeatures')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-sm">{t('screens.wallet.nftHealthCertificates')}</span>
            <Badge variant="outline" className="text-xs">Q2 2024</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm">{t('screens.wallet.cryptoBridge')}</span>
            <Badge variant="outline" className="text-xs">Q1 2024</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span className="text-sm">{t('screens.wallet.aiHealthTrading')}</span>
            <Badge variant="outline" className="text-xs">Q3 2024</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span className="text-sm">{t('screens.wallet.defiHealthPools')}</span>
            <Badge variant="outline" className="text-xs">Q4 2024</Badge>
          </div>
        </div>
        
        <div className="text-center py-3 bg-primary/10 rounded-lg">
          <Rocket className="h-8 w-8 text-primary mx-auto mb-2" />
          <div className="text-sm font-medium">{t('screens.wallet.firstKnow')}</div>
        </div>
        
        <Button variant="outline" className="w-full">
          <Bell className="h-4 w-4 mr-2" />
          {t('screens.wallet.notifyMe')}
        </Button>
      </CardContent>
    </Card>
  );
}