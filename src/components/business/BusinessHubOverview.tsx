/**
 * BUSINESS HUB OVERVIEW
 * 
 * Unified dashboard for ALL income sources (direct sales + reselling).
 * Single source of truth backed by Wallet.
 */

import { Button } from "@/components/ui/button";
import { Plus, Users, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BusinessHubAutopilotBanner } from "./BusinessHubAutopilotBanner";
import { UnifiedEarningsKPIStrip } from "./UnifiedEarningsKPIStrip";
import { EarningsActivityFeed } from "./EarningsActivityFeed";
import { EarningsBySourceCards } from "./EarningsBySourceCards";
import { useUnifiedEarnings } from "@/hooks/useUnifiedEarnings";

interface BusinessHubOverviewProps {
  onCreateService: () => void;
  onCreateEvent: () => void;
  onCreateCampaign: () => void;
}

export function BusinessHubOverview({ 
  onCreateService, 
  onCreateEvent, 
  onCreateCampaign 
}: BusinessHubOverviewProps) {
  const navigate = useNavigate();
  const { earnings, isLoading } = useUnifiedEarnings();

  return (
    <div className="space-y-8">
      {/* Autopilot Suggestion Strip */}
      <BusinessHubAutopilotBanner />
      
      {/* Unified Earnings KPI Strip */}
      <UnifiedEarningsKPIStrip
        totalEarnings={earnings.totalEarnings}
        earnings30Days={earnings.earnings30Days}
        pendingPayout={earnings.pendingPayout}
        inWallet={earnings.inWallet}
        isLoading={isLoading}
      />

      {/* Earnings Activity Feed */}
      <EarningsActivityFeed
        transactions={earnings.recentTransactions}
        isLoading={isLoading}
      />

      {/* Earnings by Source */}
      <EarningsBySourceCards
        directSales={earnings.bySource.directSales}
        resellerCommissions={earnings.bySource.resellerCommissions}
        isLoading={isLoading}
      />

      {/* Quick Actions */}
      <div className="space-y-3">
        <div className="h-px bg-border/[0.08]" />
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60 pt-1">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full gap-2"
            onClick={onCreateService}
          >
            <Plus className="h-4 w-4" />
            Create a service
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full gap-2"
            onClick={onCreateEvent}
          >
            <Users className="h-4 w-4" />
            Add a client
          </Button>
          <Button 
            size="sm" 
            className="rounded-full gap-2"
            onClick={() => navigate("/business/sell-earn")}
          >
            Go to Sell & Earn
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
