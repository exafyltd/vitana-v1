import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import { DataWalletCard } from "@/components/crossover/DataWalletCard";
import { useNavigate } from "react-router-dom";
import { useAutopilot } from "@/hooks/use-autopilot";
import { walletNavigation } from "@/config/navigation";
import { Universal3CardHeader } from "@/components/Universal3CardHeader";

// New wallet cards
import { BalanceSnapshotCard } from "@/components/wallet/BalanceSnapshotCard";
import { PendingRewardsCard } from "@/components/wallet/PendingRewardsCard";
import { LifetimeEarningsCard } from "@/components/wallet/LifetimeEarningsCard";
import { RewardsBalanceCard } from "@/components/wallet/RewardsBalanceCard";
import { ActiveBenefitsCard } from "@/components/wallet/ActiveBenefitsCard";
import { ReferralsSnapshotCard } from "@/components/wallet/ReferralsSnapshotCard";
import { ThisMonthCommissionsCard } from "@/components/wallet/ThisMonthCommissionsCard";
import { SubscriptionsOverviewCard } from "@/components/wallet/SubscriptionsOverviewCard";
import { LabWalletCard } from "@/components/wallet/LabWalletCard";
import { ComingSoonCard } from "@/components/wallet/ComingSoonCard";
import { EconomyHealthCard } from "@/components/wallet/EconomyHealthCard";

export default function Wallet() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();

  return (
    <AppLayout>
      <SEO title="Wallet | VITANA" description="VITANA Digital Wallet" canonical={window.location.href} />
      <SubNavigation items={walletNavigation} />
      
      <Universal3CardHeader
        title="Your Digital Wallet"
        description="Manage your health data rewards and digital assets."
        emoji="💳"
      />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">

          {/* 12-Card Pinterest Grid Layout */}
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            <div className="break-inside-avoid mb-4">
              <BalanceSnapshotCard />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <PendingRewardsCard />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <LifetimeEarningsCard />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <RewardsBalanceCard />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <ActiveBenefitsCard />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <DataWalletCard />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <ReferralsSnapshotCard />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <ThisMonthCommissionsCard />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <SubscriptionsOverviewCard />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <LabWalletCard />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <ComingSoonCard />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <EconomyHealthCard />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}