import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { communityNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Plus, Users, Search } from "lucide-react";
import { CreateMeetupPopup } from "@/components/CreateMeetupPopup";
import { useState } from "react";

export default withScreenId(function Meetups() {
  const [createMeetupOpen, setCreateMeetupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title="Meetups | Community" description="Discover and join local meetups and events" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6">
        <StandardHeader
          title="Meetups"
          description="Find and attend local wellness meetups and community events."
          emoji="🤝"
        />

        {/* Utility Action Button */}
        <UtilityActionButton>
          <ExpandableSearchButton 
            placeholder="Search Meetups…"
            onSearch={(query) => console.log('Search Meetups:', query)}
          />
          <Button size="sm" onClick={() => setCreateMeetupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            MeetUp
          </Button>
        </UtilityActionButton>

        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No meetups yet</h3>
          <p className="text-muted-foreground">Create your first meetup to bring the community together!</p>
        </div>
      </div>

      {/* Create Meetup Popup */}
      <CreateMeetupPopup 
        isOpen={createMeetupOpen} 
        onClose={() => setCreateMeetupOpen(false)}
      />
    </AppLayout>
  );
}, SCREEN_IDS.COMMUNITY_MEETUPS);