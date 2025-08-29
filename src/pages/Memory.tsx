import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import { AutoPilotActionCard } from "@/components/crossover/AutoPilotActionCard";
import { VitanaIndexCard } from "@/components/crossover/VitanaIndexCard";
import { SmartCalendarCard } from "@/components/crossover/SmartCalendarCard";
import { StandardCard } from "@/components/templates/StandardCard";
import { Database, Plane, Calendar, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { memoryNavigation } from "@/config/navigation";
import StandardHeader from "@/components/StandardHeader";

export default function Memory() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [showPreview, setShowPreview] = useState(false);
  
  const latestActions = getLatestActions(2);

  return (
    <AppLayout>
      <SEO title="Memory | VITANA" description="VITANA Memory & Timeline" canonical={window.location.href} />
      <SubNavigation items={memoryNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Your Health Memory"
            description="Track your wellness journey through time and AI insights."
            emoji="🧠"
          />

          {/* Content Grid */}
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            <div className="break-inside-avoid mb-4">
              <SmartCalendarCard />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <StandardCard 
                title="Memory Score"
                subtitle="AI-Generated Insights"
                icon={Brain}
                content={
                  <div className="space-y-3">
                    <div className="text-2xl font-bold text-purple-600">94%</div>
                    <div className="text-sm text-muted-foreground">Your wellness journey tracking accuracy</div>
                  </div>
                }
              />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <StandardCard 
                title="Coming Soon"
                subtitle="Memory Features"
                icon={Database}
                content={
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Health journey timeline</p>
                    <p>• AI pattern recognition</p>
                    <p>• Milestone tracking</p>
                    <p>• Progress correlations</p>
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