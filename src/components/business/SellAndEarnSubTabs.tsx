import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResellerAvailableEventsTab } from "@/components/reseller/ResellerAvailableEventsTab";
import { ResellerCampaignsTab } from "@/components/reseller/ResellerCampaignsTab";
import { ResellerSalesTab } from "@/components/reseller/ResellerSalesTab";
import { ResellerHeader } from "@/components/reseller/ResellerHeader";
import { AutopilotSuggestionsBanner } from "@/components/reseller/AutopilotSuggestionsBanner";
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

  // Reseller view
  return (
    <div className="space-y-6">
      <AutopilotSuggestionsBanner />
      <ResellerHeader />
      
      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="available">Available to Sell</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
        </TabsList>
        
        <TabsContent value="available">
          <ResellerAvailableEventsTab />
        </TabsContent>
        
        <TabsContent value="promotions">
          <ResellerCampaignsTab searchQuery={searchQuery} />
        </TabsContent>
        
        <TabsContent value="sales">
          <ResellerSalesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
