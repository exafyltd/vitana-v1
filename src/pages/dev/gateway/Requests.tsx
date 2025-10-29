import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Globe, Activity, Clock, Filter } from "lucide-react";
import { devGatewayNavigation } from "@/config/dev-navigation";

export default function GatewayRequests() {
  const [activeTab, setActiveTab] = useState("logs");

  return (
    <>
      <SEO 
        title="Vitana DEV — Gateway Requests" 
        description="Gateway request logs and monitoring"
        canonical={window.location.href}
      />

      <SubNavigation items={devGatewayNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Gateway Requests"
            description="Gateway request logs and monitoring"
            emoji="🌐"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search requests…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="logs">Request Logs</SplitBarTrigger>
              <SplitBarTrigger value="performance">Response Times</SplitBarTrigger>
              <SplitBarTrigger value="errors">Error Rates</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="logs" className="mt-6">
              <DevEmptyState 
                title="Request Logs" 
                description="View detailed gateway request logs with headers, payloads, and responses."
                icon={Globe}
              />
            </SplitBarContent>

            <SplitBarContent value="performance" className="mt-6">
              <DevEmptyState 
                title="Response Times" 
                description="Monitor gateway response times and performance metrics."
                icon={Activity}
              />
            </SplitBarContent>

            <SplitBarContent value="errors" className="mt-6">
              <DevEmptyState 
                title="Error Rates" 
                description="Analyze gateway error rates and failure patterns."
                icon={Clock}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
