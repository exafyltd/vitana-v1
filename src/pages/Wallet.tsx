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

const walletSubItems = [
  { id: "overview", name: "Overview", path: "/wallet" },
  { id: "balance", name: "Balance & Benefits", path: "/wallet/balance" },
  { id: "subscriptions", name: "Subscriptions", path: "/wallet/subscriptions" },
  { id: "rewards", name: "Rewards & Commissions", path: "/wallet/rewards" },
];

export default function Wallet() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [showPreview, setShowPreview] = useState(false);
  
  const latestActions = getLatestActions(2);

  return (
    <AppLayout>
      <SEO title="Wallet | VITANA" description="VITANA Digital Wallet" canonical={window.location.href} />
      <SubNavigation items={walletSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section - Three Cards Layout */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Your Digital Wallet 💳</h1>
                <p className="text-muted-foreground">Manage your health data rewards and digital assets.</p>
              </div>
            </div>
            
            {/* Autopilot Card */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl relative"
              onMouseEnter={() => setShowPreview(true)}
              onMouseLeave={() => setShowPreview(false)}
            >
              {pendingCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs animate-pulse z-10"
                >
                  {pendingCount}
                </Badge>
              )}
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div>
                  <Plane className="w-10 h-10 text-red-400 transform rotate-0" />
                </div>
                <span className="text-sm font-medium text-red-400">Autopilot</span>
              </div>
            </div>
            
            {/* Vitana Index Card */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">742</span>
                </div>
              </div>
            </div>
          </div>

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