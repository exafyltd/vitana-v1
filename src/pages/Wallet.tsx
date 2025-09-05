import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import { AutoPilotActionCard } from "@/components/crossover/AutoPilotActionCard";
import { VitanaIndexCard } from "@/components/crossover/VitanaIndexCard";
import { DataWalletCard } from "@/components/crossover/DataWalletCard";
import { StandardCard } from "@/components/templates/StandardCard";
import { Wallet as WalletIcon, Plane, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { walletNavigation } from "@/config/navigation";
import StandardHeader from "@/components/StandardHeader";

export default function Wallet() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [showPreview, setShowPreview] = useState(false);
  
  const latestActions = getLatestActions(2);

  return (
    <AppLayout>
      <SEO title="Wallet | VITANA" description="VITANA Digital Wallet" canonical={window.location.href} />
      <SubNavigation items={walletNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Your Digital Wallet"
            description="Manage your health data rewards and digital assets."
            emoji="💳"
          />

          {/* Content Grid */}
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            <div className="break-inside-avoid mb-4">
              <DataWalletCard />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <StandardCard 
                title="Rewards Balance"
                subtitle="Health Data Points"
                icon={TrendingUp}
                content={
                  <div className="space-y-3">
                    <div className="text-2xl font-bold text-green-600">2,847 VTP</div>
                    <div className="text-sm text-muted-foreground">Vitana Token Points earned from health activities</div>
                  </div>
                }
              />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <StandardCard 
                title="Coming Soon"
                subtitle="Wallet Features"
                icon={WalletIcon}
                content={
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Digital asset management</p>
                    <p>• Health data monetization</p>
                    <p>• Token rewards system</p>
                    <p>• Secure transactions</p>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}