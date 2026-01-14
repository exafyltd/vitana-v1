import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { communityNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Plus, MessageSquare } from "lucide-react";
import { CreateContentPopup } from "@/components/CreateContentPopup";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

export default withScreenId(function Feed() {
  const [createContentOpen, setCreateContentOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("following");
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const isMobile = useIsMobile();
  const { pendingCount } = useAutopilot();

  return (
    <AppLayout>
      <SEO title="Feed | Community" description="Stay updated with your community feed" canonical={window.location.href} />
      {!isMobile && <SubNavigation items={communityNavigation} />}
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <StandardHeader
          title="Community Feed"
          description="Stay updated with posts, updates, and activities from your community."
          emoji="📱"
        />

        {/* Utility Action Button - Unified Mobile Pattern */}
        <UtilityActionButton className="min-w-0">
          <div className="flex items-center gap-2.5 min-w-max">
            <ExpandableSearchButton 
              placeholder="Search feed..."
              onSearch={(query) => console.log('Search Feed:', query)}
            />
            <UniversalCalendarButton />
            
            {/* Create - PRIMARY ACTION */}
            <Button 
              size="sm" 
              onClick={() => setCreateContentOpen(true)}
              className="h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" />
              {!isMobile && <span>Content</span>}
            </Button>
            
            {/* Vitana Index chip (mobile only) */}
            {isMobile && <VitanaIndexChip />}
            
            {/* Autopilot chip (mobile only) */}
            {isMobile && (
              <AutopilotChip 
                pendingCount={pendingCount} 
                onClick={() => setAutopilotOpen(true)} 
              />
            )}
          </div>
        </UtilityActionButton>

        {/* Split Navigation */}
        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="following">👥 Following</SplitBarTrigger>
            <SplitBarTrigger value="recommended">✨ Recommended</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="following">
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground">Follow some groups or people to see their posts here.</p>
            </div>
          </SplitBarContent>

          <SplitBarContent value="recommended">
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Recommended content</h3>
              <p className="text-muted-foreground">Personalized content recommendations will appear here.</p>
            </div>
          </SplitBarContent>
        </SplitBar>
      </div>

      {/* Create Content Popup */}
      <CreateContentPopup 
        isOpen={createContentOpen} 
        onClose={() => setCreateContentOpen(false)}
      />
      
      {/* Autopilot Popup */}
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
    </AppLayout>
  );
}, SCREEN_IDS.COMMUNITY_FEED);