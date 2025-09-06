import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Search } from "lucide-react";
import { CreateEventPopup } from "@/components/CreateEventPopup";
import { useState } from "react";

import { communityNavigation } from "@/config/navigation";

export default function Events() {
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("today");

  return (
    <AppLayout>
      <SEO title="Events | Community" description="Create and manage your events and special occasions" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6">
        <StandardHeader
          title="Events"
          description="Create and manage your events and special occasions."
          emoji="🎉"
        />

        {/* Utility Action Button */}
        <UtilityActionButton>
          <Button variant="outline" size="sm">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
          <Button size="sm" onClick={() => setCreateEventOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Event
          </Button>
        </UtilityActionButton>

        {/* Split Navigation */}
        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="today">Today</SplitBarTrigger>
            <SplitBarTrigger value="upcoming">Upcoming</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="today">
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No events today</h3>
              <p className="text-muted-foreground">Create your first event to get started!</p>
            </div>
          </SplitBarContent>

          <SplitBarContent value="upcoming">
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No upcoming events</h3>
              <p className="text-muted-foreground">Create your first event to get started!</p>
            </div>
          </SplitBarContent>
        </SplitBar>
      </div>
      
      {/* Create Event Popup */}
      <CreateEventPopup 
        isOpen={createEventOpen} 
        onClose={() => setCreateEventOpen(false)}
      />
    </AppLayout>
  );
}