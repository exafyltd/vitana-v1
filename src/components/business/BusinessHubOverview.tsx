/**
 * BUSINESS HUB OVERVIEW
 * 
 * Unified dashboard for ALL income sources (direct sales + reselling).
 * Split into Snapshot (KPIs) and History (transaction ledger) tabs.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Users, ArrowRight, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { BusinessHubAutopilotBanner } from "./BusinessHubAutopilotBanner";
import { UnifiedEarningsKPIStrip } from "./UnifiedEarningsKPIStrip";
import { TopPerformerCard } from "./TopPerformerCard";
import { EarningsHistoryLedger } from "./EarningsHistoryLedger";
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
  const [activeTab, setActiveTab] = useState("snapshot");

  // Calculate top performer from transactions
  const topPerformer = earnings.recentTransactions.reduce(
    (best, tx) => {
      if (tx.amount > (best?.revenue || 0)) {
        return {
          name: tx.title,
          type: "event" as const,
          revenue: tx.amount,
          ticketsSold: tx.metadata?.ticketsSold || 1,
        };
      }
      return best;
    },
    null as { name: string; type: "event" | "service"; revenue: number; ticketsSold?: number } | null
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <SplitBar value={activeTab} onValueChange={setActiveTab}>
        <SplitBarList>
          <SplitBarTrigger value="snapshot">📊 Snapshot</SplitBarTrigger>
          <SplitBarTrigger value="history">📜 History</SplitBarTrigger>
        </SplitBarList>

        {/* Snapshot Tab */}
        <SplitBarContent value="snapshot" className="mt-6 space-y-6">
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

          {/* Top Performer Card */}
          <TopPerformerCard
            name={topPerformer?.name || ""}
            type={topPerformer?.type || "event"}
            revenue={topPerformer?.revenue || 0}
            ticketsSold={topPerformer?.ticketsSold}
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
                onClick={onCreateCampaign}
              >
                <Megaphone className="h-4 w-4" />
                Create promotion
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
        </SplitBarContent>

        {/* History Tab */}
        <SplitBarContent value="history" className="mt-6">
          <EarningsHistoryLedger
            transactions={earnings.recentTransactions}
            isLoading={isLoading}
          />
        </SplitBarContent>
      </SplitBar>
    </div>
  );
}
