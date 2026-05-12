/**
 * Business Hub Overview
 * Unified dashboard with Snapshot (KPIs + Accelerator CTA) and History tabs
 */

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUnifiedEarnings } from "@/hooks/useUnifiedEarnings";
import { UnifiedEarningsKPIStrip } from "./UnifiedEarningsKPIStrip";
import { BusinessAcceleratorCenterCTA } from "./BusinessAcceleratorCenterCTA";
import { EarningsHistoryLedger } from "./EarningsHistoryLedger";
import { MissionOpportunitiesCard } from "./MissionOpportunitiesCard";
import {
  SplitBar,
  SplitBarList,
  SplitBarTrigger,
  SplitBarContent,
} from "@/components/ui/split-bar";
import { t } from '@/lib/i18n-toast';

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
];

export function BusinessHubOverview({
  onCreateService,
  onCreateEvent,
  onCreateCampaign,
}: BusinessHubOverviewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { earnings, isLoading } = useUnifiedEarnings();
  
  // URL-driven tab state
  const activeTab = searchParams.get("tab") || "snapshot";
  const dateRange = searchParams.get("range");
  
  const setActiveTab = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tab);
    // Clear range filter when switching to snapshot
    if (tab === "snapshot") {
      newParams.delete("range");
    }
    setSearchParams(newParams);
  };

  const handleCreateEvent = () => {
    onCreateEvent?.();
  };

  const handleAddToInventory = () => {
    navigate("/business/sell-earn");
  };

  const handleCreateService = () => {
    onCreateService?.();
  };

  const handleCreatePromotion = () => {
    onCreateCampaign?.();
  };

  return (
    <div className="space-y-6">
      <SplitBar value={activeTab} onValueChange={setActiveTab}>
        <SplitBarList>
          <SplitBarTrigger value="snapshot">{t('screens.business.snapshot')}</SplitBarTrigger>
          <SplitBarTrigger value="history">{t('screens.business.history')}</SplitBarTrigger>
        </SplitBarList>

        <SplitBarContent value="snapshot" className="space-y-8 pt-4">
          {/* KPI Strip */}
          <UnifiedEarningsKPIStrip
            totalEarnings={earnings.totalEarnings}
            earnings30Days={earnings.earnings30Days}
            pendingPayout={earnings.pendingPayout}
            inWallet={earnings.inWallet}
            isLoading={isLoading}
          />

          {/* Business Accelerator Center CTA */}
          <BusinessAcceleratorCenterCTA
            onCreateEvent={handleCreateEvent}
            onAddToInventory={handleAddToInventory}
            onCreateService={handleCreateService}
            onCreatePromotion={handleCreatePromotion}
          />

          {/* Mission Opportunities — Phase 6 surface 3 of Ultimate Goal hardening.
              Surfaces autopilot recs with economic_axis != 'none' so the user
              sees concrete economy-aligned actions on their business surface.
              docs/GOVERNANCE/ULTIMATE-GOAL.md */}
          <MissionOpportunitiesCard />
        </SplitBarContent>

        <SplitBarContent value="history" className="pt-4">
          <EarningsHistoryLedger
            transactions={earnings.recentTransactions.length > 0 ? earnings.recentTransactions : mockTransactions}
            isLoading={isLoading}
            dateRange={dateRange}
          />
        </SplitBarContent>
      </SplitBar>
    </div>
  );
}
