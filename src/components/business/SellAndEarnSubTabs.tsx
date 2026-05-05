/**
 * SELL AND EARN SUB TABS (Simplified for v1)
 *
 * Inventory | Promotions | Referrals (VAEA)
 * Sales and Overview moved to Business Hub Overview.
 */

import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { ResellerAvailableEventsTab } from "@/components/reseller/ResellerAvailableEventsTab";
import { ResellerCampaignsTab } from "@/components/reseller/ResellerCampaignsTab";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ticket, Loader2 } from "lucide-react";
import { useIsReseller } from "@/hooks/useIsReseller";
import { useActivateReseller } from "@/hooks/useActivateReseller";
import { isMockResellerSalesEnabled } from "@/lib/mocks/mockResellerSales";
import { VaeaDraftsStrip } from "@/components/business/vaea/VaeaDraftsStrip";
import { VaeaCatalogPanel } from "@/components/business/vaea/VaeaCatalogPanel";
import { VaeaDetectedList } from "@/components/business/vaea/VaeaDetectedList";
import { t } from '@/lib/i18n-toast';

interface SellAndEarnSubTabsProps {
  searchQuery?: string;
}

export function SellAndEarnSubTabs({ searchQuery = "" }: SellAndEarnSubTabsProps) {
  const { isReseller, isLoading: isLoadingReseller } = useIsReseller();
  const { activateResellerForCurrentUser, isActivating } = useActivateReseller();
  const mockEnabled = isMockResellerSalesEnabled();

  // Loading state (skip if mock mode)
  if (isLoadingReseller && !mockEnabled) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not a reseller - show activation card (bypass if mock mode)
  if (!isReseller && !mockEnabled) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md bg-white/70 backdrop-blur-sm border border-white/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-2">
              <Ticket className="h-6 w-6 text-accent" />
            </div>
            <CardTitle>{t('screens.business.startSellingEventTickets')}</CardTitle>
            <CardDescription>
              Become a reseller to earn commissions by promoting and selling tickets for events.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => activateResellerForCurrentUser({ showToast: true, redirectAfter: false })}
              disabled={isActivating}
              className="rounded-full"
            >
              {isActivating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                "Activate Reseller Mode"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* VAEA shadow drafts — hidden entirely when empty; visible from any sub-tab when VAEA has something */}
      <VaeaDraftsStrip />

      <SplitBar defaultValue="available" className="w-full">
        <SplitBarList>
          <SplitBarTrigger value="available">{t('screens.business.inventory')}</SplitBarTrigger>
          <SplitBarTrigger value="promotions">{t('screens.business.promotions')}</SplitBarTrigger>
          <SplitBarTrigger value="referrals">{t('screens.business.referrals')}</SplitBarTrigger>
        </SplitBarList>

        <SplitBarContent value="available" className="pt-4">
          <ResellerAvailableEventsTab />
        </SplitBarContent>

        <SplitBarContent value="promotions" className="pt-4">
          <ResellerCampaignsTab searchQuery={searchQuery} />
        </SplitBarContent>

        <SplitBarContent value="referrals" className="pt-4 space-y-4">
          <VaeaCatalogPanel />
          <VaeaDetectedList collapsible limit={25} />
        </SplitBarContent>
      </SplitBar>
    </>
  );
}
