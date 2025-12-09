import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { communityNavigation } from "@/config/navigation";
import { ResellerHeader } from "@/components/reseller/ResellerHeader";
import { ResellerEventsTab } from "@/components/reseller/ResellerEventsTab";
import { ResellerCampaignsTab } from "@/components/reseller/ResellerCampaignsTab";
import { ResellerSalesTab } from "@/components/reseller/ResellerSalesTab";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function MyEventsSales() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("events");
  const navigate = useNavigate();

  return (
    <AppLayout>
      <SEO 
        title="My Events & Sales | VITANA"
        description="Manage your events, campaigns, and track sales performance"
      />
      
      <div className="flex flex-col min-h-screen">
        <SubNavigation items={communityNavigation} />
        
        <div className="flex-1 p-6 space-y-6">
          <ResellerHeader />
          
          <div className="flex items-center justify-between gap-4">
            <ExpandableSearchButton
              placeholder="Search events..."
              onSearch={setSearchQuery}
            />
            <Button onClick={() => navigate("/comm/events-meetups")} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </div>
          
          <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="events">Events</SplitBarTrigger>
              <SplitBarTrigger value="campaigns">Campaigns</SplitBarTrigger>
              <SplitBarTrigger value="sales">Sales</SplitBarTrigger>
            </SplitBarList>
            
            <SplitBarContent value="events">
              <ResellerEventsTab searchQuery={searchQuery} />
            </SplitBarContent>
            
            <SplitBarContent value="campaigns">
              <ResellerCampaignsTab searchQuery={searchQuery} />
            </SplitBarContent>
            
            <SplitBarContent value="sales">
              <ResellerSalesTab />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </AppLayout>
  );
}
