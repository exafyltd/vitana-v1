import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { ResellerAvailableEventsTab } from "@/components/reseller/ResellerAvailableEventsTab";
import { ResellerClientEventsTab } from "@/components/reseller/ResellerClientEventsTab";
import { ResellerCampaignsTab } from "@/components/reseller/ResellerCampaignsTab";
import { ResellerSalesTab } from "@/components/reseller/ResellerSalesTab";
import { ResellerOverviewTab } from "@/components/reseller/ResellerOverviewTab";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Ticket, Loader2 } from "lucide-react";
import { useIsReseller } from "@/hooks/useIsReseller";
import { useActivateReseller } from "@/hooks/useActivateReseller";

interface SellAndEarnSubTabsProps {
  searchQuery?: string;
}

export function SellAndEarnSubTabs({ searchQuery = "" }: SellAndEarnSubTabsProps) {
  const { isReseller, isLoading: isLoadingReseller } = useIsReseller();
  const { activateResellerForCurrentUser, isActivating } = useActivateReseller();

  // Loading state
  if (isLoadingReseller) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not a reseller - show activation card
  if (!isReseller) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md bg-white/70 backdrop-blur-sm border border-white/20">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <Ticket className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">Enable Sell & Earn</h3>
            <p className="text-muted-foreground">
              Activate reseller mode to sell tickets for partner events and earn commission on every sale.
            </p>
            <Button 
              onClick={() => activateResellerForCurrentUser({ redirectAfter: false })}
              disabled={isActivating}
              className="gap-2"
            >
              {isActivating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                "Activate Sell & Earn"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reseller view with 5 tabs (Overview as default)
  return (
    <SplitBar defaultValue="overview" className="w-full">
      <SplitBarList>
        <SplitBarTrigger value="overview">📊 Overview</SplitBarTrigger>
        <SplitBarTrigger value="available">🛒 Available to Sell</SplitBarTrigger>
        <SplitBarTrigger value="client-events">👤 Client Events</SplitBarTrigger>
        <SplitBarTrigger value="promotions">📢 Promotions</SplitBarTrigger>
        <SplitBarTrigger value="sales">💰 Sales</SplitBarTrigger>
      </SplitBarList>
      
      <SplitBarContent value="overview" className="mt-4">
        <ResellerOverviewTab />
      </SplitBarContent>

      <SplitBarContent value="available" className="mt-4">
        <ResellerAvailableEventsTab />
      </SplitBarContent>

      <SplitBarContent value="client-events" className="mt-4">
        <ResellerClientEventsTab />
      </SplitBarContent>
      
      <SplitBarContent value="promotions" className="mt-4">
        <ResellerCampaignsTab searchQuery={searchQuery} />
      </SplitBarContent>
      
      <SplitBarContent value="sales" className="mt-4">
        <ResellerSalesTab />
      </SplitBarContent>
    </SplitBar>
  );
}
