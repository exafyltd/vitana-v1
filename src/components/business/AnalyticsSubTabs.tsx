import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, DollarSign, TrendingUp, Wallet, Share2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useResellerSales } from "@/hooks/useResellerSales";
import { useIsReseller } from "@/hooks/useIsReseller";
import { VaeaDetectionsCard } from "@/components/business/vaea/VaeaDetectionsCard";
import { t } from '@/lib/i18n-toast';

export function AnalyticsSubTabs() {
  const navigate = useNavigate();
  const { isReseller } = useIsReseller();
  const { data: resellerSales } = useResellerSales();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <SplitBar defaultValue="performance" className="w-full">
      <SplitBarList>
        <SplitBarTrigger value="performance">{t('screens.business.performance')}</SplitBarTrigger>
        <SplitBarTrigger value="earnings">{t('screens.business.earnings')}</SplitBarTrigger>
        <SplitBarTrigger value="growth">{t('screens.business.growth')}</SplitBarTrigger>
      </SplitBarList>

      <SplitBarContent value="performance" className="space-y-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white/70 backdrop-blur-sm border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5" />
                {t('screens.business.bookingsOverview')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('screens.business.bookingAnalyticsComingSoon')}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/70 backdrop-blur-sm border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                {t('screens.business.attendanceRates')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('screens.business.attendanceMetricsComingSoon')}
              </p>
            </CardContent>
          </Card>

          <VaeaDetectionsCard />
        </div>
      </SplitBarContent>

      <SplitBarContent value="earnings" className="space-y-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/70 backdrop-blur-sm border border-white/20">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-400/20 to-emerald-500/20">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('screens.business.servicesEvents')}</p>
                  <p className="text-2xl font-bold">$2,450</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {isReseller && resellerSales && (
            <Card className="bg-white/70 backdrop-blur-sm border border-white/20">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-400/20 to-fuchsia-500/20">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('screens.business.resellerCommission')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(resellerSales.totalCommissionEarned)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card className="bg-white/70 backdrop-blur-sm border border-white/20">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400/20 to-cyan-500/20">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('screens.business.walletBalance')}</p>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-lg font-semibold"
                    onClick={() => navigate("/wallet")}
                  >
                    {t('screens.business.viewWallet')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SplitBarContent>

      <SplitBarContent value="growth" className="space-y-4 mt-4">
        <Card className="bg-white/70 backdrop-blur-sm border border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5" />
              {t('screens.business.clientGrowth')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8 space-y-4">
            <p className="text-sm text-muted-foreground">
              Growth analytics will show new clients over time and traffic sources.
            </p>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => navigate("/sharing")}
            >
              <Share2 className="w-4 h-4" />
              {t('screens.business.createCampaignSharing')}
            </Button>
          </CardContent>
        </Card>
      </SplitBarContent>
    </SplitBar>
  );
}
