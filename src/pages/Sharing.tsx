import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import { AutoPilotActionCard } from "@/components/crossover/AutoPilotActionCard";
import { VitanaIndexCard } from "@/components/crossover/VitanaIndexCard";
import { VideoFeedCard } from "@/components/crossover/VideoFeedCard";
import { StandardCard } from "@/components/templates/StandardCard";
import { Share2, Plane, Users, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { sharingNavigation } from "@/config/navigation";
import StandardHeader from "@/components/StandardHeader";

export default function Sharing() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [showPreview, setShowPreview] = useState(false);
  
  const latestActions = getLatestActions(2);

  return (
    <AppLayout>
      <SEO title="Sharing | VITANA" description="VITANA Content Sharing" canonical={window.location.href} />
      <SubNavigation items={sharingNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Share Your Journey"
            description="Connect and share your wellness achievements with the community."
            emoji="📱"
          />

          {/* Content Grid */}
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            <div className="break-inside-avoid mb-4">
              <VideoFeedCard />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <StandardCard 
                title="Social Connections"
                subtitle="Your Network"
                icon={Users}
                content={
                  <div className="space-y-3">
                    <div className="text-2xl font-bold text-blue-600">127 Followers</div>
                    <div className="text-sm text-muted-foreground">Connected wellness enthusiasts</div>
                  </div>
                }
              />
            </div>
            
            <div className="break-inside-avoid mb-4">
              <StandardCard 
                title="Coming Soon"
                subtitle="Sharing Features"
                icon={Share2}
                content={
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Progress sharing</p>
                    <p>• Community challenges</p>
                    <p>• Achievement badges</p>
                    <p>• Social media integration</p>
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