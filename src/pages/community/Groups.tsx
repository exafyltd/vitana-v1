import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";
import { CreateGroupPopup } from "@/components/CreateGroupPopup";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

import { communityNavigation } from "@/config/navigation";

export default function Groups() {
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("my-groups");
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const isMobile = useIsMobile();
  const { pendingCount } = useAutopilot();

  return (
    <AppLayout>
      <SEO title="Groups | Community" description="Join and manage community groups" canonical={window.location.href} />
      {!isMobile && <SubNavigation items={communityNavigation} />}
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title="Find your wellness tribe!"
            description="Join groups with shared interests or create your own community groups."
            emoji="👥"
          />

          {/* Utility Action Button - Unified Mobile Pattern */}
          <UtilityActionButton className="min-w-0">
            <div className="flex items-center gap-2.5 min-w-max">
              <ExpandableSearchButton 
                placeholder="Search groups..." 
                onSearch={(query) => console.log('Search Groups:', query)}
              />
              <UniversalCalendarButton />
              
              {/* Create - PRIMARY ACTION */}
              <Button 
                onClick={() => setCreateGroupOpen(true)}
                size="sm"
                className="h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
              >
                <Plus className="h-4 w-4" />
                {!isMobile && <span>Create</span>}
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
              <SplitBarTrigger value="my-groups">👥 My Groups</SplitBarTrigger>
              <SplitBarTrigger value="recommended">✨ Recommended</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="my-groups">
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
                <p className="text-muted-foreground">Join your first group to get started!</p>
              </div>
            </SplitBarContent>

            <SplitBarContent value="recommended">
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Recommended groups</h3>
                <p className="text-muted-foreground">Group recommendations will appear here based on your interests.</p>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      {/* Create Group Popup */}
      <CreateGroupPopup 
        isOpen={createGroupOpen} 
        onClose={() => setCreateGroupOpen(false)}
      />
      
      {/* Autopilot Popup */}
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
    </AppLayout>
  );
}