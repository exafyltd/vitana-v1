/**
 * BUSINESS HUB OVERVIEW
 * 
 * Unified dashboard for ALL income sources (direct sales + reselling).
 * Split into Snapshot (KPIs) and History (transaction ledger) tabs.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { UnifiedEarningsKPIStrip } from "./UnifiedEarningsKPIStrip";
import { BusinessStarterPanel } from "./BusinessStarterPanel";
import { EarningsHistoryLedger } from "./EarningsHistoryLedger";
import { useUnifiedEarnings } from "@/hooks/useUnifiedEarnings";

interface BusinessHubOverviewProps {
  onCreateService: () => void;
  onCreateEvent: () => void;
  onCreateCampaign: () => void;
}

// Mock data for visual preview
const mockTransactions = [
  {
    id: "mock-1",
    type: "direct_sale" as const,
    title: "Breathwork Masterclass",
    source: "My Event",
    amount: 85,
    currency: "EUR",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { ticketsSold: 2, grossAmount: 120, status: "paid_to_wallet" },
  },
  {
    id: "mock-2",
    type: "reseller_commission" as const,
    title: "Yoga Retreat Weekend",
    source: "Sell & Earn",
    amount: 18,
    currency: "EUR",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { ticketsSold: 3, grossAmount: 180, status: "pending_payout" },
  },
  {
    id: "mock-3",
    type: "direct_sale" as const,
    title: "Sound Healing Session",
    source: "My Event",
    amount: 45,
    currency: "EUR",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { ticketsSold: 1, grossAmount: 45, status: "paid_to_wallet" },
  },
  {
    id: "mock-4",
    type: "reseller_commission" as const,
    title: "Longevity Summit 2025",
    source: "Sell & Earn",
    amount: 42,
    currency: "EUR",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { ticketsSold: 7, grossAmount: 420, status: "paid_to_wallet" },
  },
  {
    id: "mock-5",
    type: "direct_sale" as const,
    title: "Ice Bath Experience",
    source: "My Event",
    amount: 150,
    currency: "EUR",
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { ticketsSold: 5, grossAmount: 250, status: "pending_payout" },
  },
];

export function BusinessHubOverview({ 
  onCreateService, 
  onCreateEvent, 
  onCreateCampaign 
}: BusinessHubOverviewProps) {
  const navigate = useNavigate();
  const { earnings, isLoading } = useUnifiedEarnings();
  const [activeTab, setActiveTab] = useState("snapshot");

  const handleStartGuidedFlow = () => {
    // TODO: Open guided flow modal/drawer
    console.log("Guided flow - to be implemented");
  };

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
          {/* Unified Earnings KPI Strip */}
          <UnifiedEarningsKPIStrip
            totalEarnings={earnings.totalEarnings}
            earnings30Days={earnings.earnings30Days}
            pendingPayout={earnings.pendingPayout}
            inWallet={earnings.inWallet}
            isLoading={isLoading}
          />

          {/* Earning Momentum Panel */}
          <BusinessStarterPanel
            onCreateEvent={onCreateEvent}
            onBrowseEvents={() => navigate("/business/sell-earn")}
            onStartGuidedSetup={handleStartGuidedFlow}
          />
        </SplitBarContent>

        {/* History Tab */}
        <SplitBarContent value="history" className="mt-6">
          <EarningsHistoryLedger
            transactions={earnings.recentTransactions.length > 0 ? earnings.recentTransactions : mockTransactions}
            isLoading={isLoading}
          />
        </SplitBarContent>
      </SplitBar>
    </div>
  );
}
