import { useState } from "react";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { devDashboardNavigation } from "@/config/dev-navigation";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { Bell, AlertCircle, Clock, Plus } from "lucide-react";

export default function DashboardAlerts() {
  const [activeTab, setActiveTab] = useState("active");

  return (
    <>
      <SEO 
        title="VITANA DEV — System Alerts" 
        description="View system alerts and notifications requiring attention"
        canonical={window.location.href}
      />
      
      <SubNavigation items={devDashboardNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="System Alerts"
            description="View system alerts and notifications requiring attention"
            emoji="🔔"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search alerts…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="active">Active Alerts</SplitBarTrigger>
              <SplitBarTrigger value="history">Alert History</SplitBarTrigger>
              <SplitBarTrigger value="settings">Alert Settings</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="active" className="mt-6">
              <DevEmptyState 
                title="Active Alerts" 
                description="View and manage alerts currently requiring attention."
                icon={Bell}
              />
            </SplitBarContent>

            <SplitBarContent value="history" className="mt-6">
              <DevEmptyState 
                title="Alert History" 
                description="Review historical alerts and resolution timeline."
                icon={Clock}
              />
            </SplitBarContent>

            <SplitBarContent value="settings" className="mt-6">
              <DevEmptyState 
                title="Alert Configuration" 
                description="Configure alert thresholds, channels, and notification rules."
                icon={AlertCircle}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
