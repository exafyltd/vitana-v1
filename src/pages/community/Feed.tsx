import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { communityNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Plus, MessageSquare, Search } from "lucide-react";
import { CreateContentPopup } from "@/components/CreateContentPopup";
import { useState } from "react";

export default withScreenId(function Feed() {
  const [createContentOpen, setCreateContentOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("following");

  return (
    <AppLayout>
      <SEO title="Feed | Community" description="Stay updated with your community feed" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6">
        <StandardHeader
          title="Community Feed"
          description="Stay updated with posts, updates, and activities from your community."
          emoji="📱"
        />

        {/* Utility Action Button */}
        <UtilityActionButton>
          <ExpandableSearchButton 
            placeholder="Search Feed…"
            onSearch={(query) => console.log('Search Feed:', query)}
          />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setCreateContentOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Content
          </Button>
        </UtilityActionButton>

        {/* Split Navigation */}
        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="following">Following</SplitBarTrigger>
            <SplitBarTrigger value="recommended">Recommended</SplitBarTrigger>
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
    </AppLayout>
  );
}, SCREEN_IDS.COMMUNITY_FEED);