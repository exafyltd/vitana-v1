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
import { Globe, Activity, Smartphone, Webhook, Plus } from "lucide-react";
import { devGatewayNavigation } from "@/config/dev-navigation";
import { RestoreSessionButton } from "@/components/dev/RestoreSessionButton";
import { RestoreSessionModal } from "@/components/dev/modals/RestoreSessionModal";

export default function DevGateway() {
  const [activeTab, setActiveTab] = useState("endpoints");
  const [restoreSessionOpen, setRestoreSessionOpen] = useState(false);

  return (
    <>
      <SEO 
        title="Vitana DEV — Gateway" 
        description="API gateway management for Vitana platform"
        canonical={window.location.href}
      />

      {/* Horizontal Navigation */}
      <SubNavigation items={devGatewayNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* 3-Card Header */}
          <DevStandardHeader 
            title="API Gateway"
            description="Manage API endpoints, requests, and webhook configurations"
            emoji="🌐"
          />

          {/* Utility Action Buttons */}
          <UtilityActionButton
            trailingElement={<RestoreSessionButton onClick={() => setRestoreSessionOpen(true)} />}
          >
            <ExpandableSearchButton 
              placeholder="Search endpoints…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Endpoint
            </Button>
          </UtilityActionButton>

          {/* Split-Screen Navigation Bar */}
          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="endpoints">🔌 Endpoints</SplitBarTrigger>
              <SplitBarTrigger value="requests">📡 Requests</SplitBarTrigger>
              <SplitBarTrigger value="mobile">📱 Mobile Links</SplitBarTrigger>
              <SplitBarTrigger value="webhooks">🪝 Webhooks</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="endpoints" className="mt-6">
              <DevEmptyState 
                title="API Endpoints" 
                description="View and manage registered API endpoints."
                icon={Globe}
              />
            </SplitBarContent>

            <SplitBarContent value="requests" className="mt-6">
              <DevEmptyState 
                title="Recent Requests" 
                description="Monitor recent API requests and responses."
                icon={Activity}
              />
            </SplitBarContent>

            <SplitBarContent value="mobile" className="mt-6">
              <DevEmptyState 
                title="Mobile Deep Links" 
                description="Configure deep link routing for mobile apps."
                icon={Smartphone}
              />
            </SplitBarContent>

            <SplitBarContent value="webhooks" className="mt-6">
              <DevEmptyState 
                title="Webhook Management" 
                description="Manage webhook configurations and delivery."
                icon={Webhook}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <RestoreSessionModal 
        open={restoreSessionOpen} 
        onOpenChange={setRestoreSessionOpen}
      />
    </>
  );
}
