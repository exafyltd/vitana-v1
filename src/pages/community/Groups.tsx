import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Plus } from "lucide-react";
import { CreateGroupPopup } from "@/components/CreateGroupPopup";
import { useState } from "react";

import { communityNavigation } from "@/config/navigation";

export default function Groups() {
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("my-groups");

  return (
    <AppLayout>
      <SEO title="Groups | Community" description="Join and manage community groups" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title="Find your wellness tribe!"
            description="Join groups with shared interests or create your own community groups."
            emoji="👥"
          />

          {/* Utility Action Button */}
          <UtilityActionButton>
            <Button onClick={() => setCreateGroupOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Group
            </Button>
          </UtilityActionButton>

          {/* Split Navigation */}
          <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="my-groups">👥 My Groups</SplitBarTrigger>
              <SplitBarTrigger value="recommended">✨ Recommended Groups</SplitBarTrigger>
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
    </AppLayout>
  );
}