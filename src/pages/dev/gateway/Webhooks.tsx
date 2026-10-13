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
import { Webhook, Send, Activity, Plus } from "lucide-react";
import { devGatewayNavigation } from "@/config/dev-navigation";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";

export default function GatewayWebhooks() {
  const spotlight = useSpotlightEnabled();
  const [activeTab, setActiveTab] = useState("list");

  const devBody = (
    <>
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Webhooks"
            description="Webhook management and delivery monitoring (read-only in Phase 1)"
            emoji="🔗"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search webhooks…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" disabled>
              <Plus className="w-4 h-4 me-2" />
              New Webhook
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-surface-raised/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="list">Webhook List</SplitBarTrigger>
              <SplitBarTrigger value="deliveries">Delivery Logs</SplitBarTrigger>
              <SplitBarTrigger value="retries">Retry Policies</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="list" className="mt-6">
              <DevEmptyState 
                title="Webhook List" 
                description="Browse configured webhooks with endpoints and event triggers."
                icon={Webhook}
              />
            </SplitBarContent>

            <SplitBarContent value="deliveries" className="mt-6">
              <DevEmptyState 
                title="Delivery Logs" 
                description="Monitor webhook delivery logs with success/failure status and payloads."
                icon={Send}
              />
            </SplitBarContent>

            <SplitBarContent value="retries" className="mt-6">
              <DevEmptyState 
                title="Retry Policies" 
                description="View webhook retry policies and automatic retry configurations."
                icon={Activity}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
    </>
  );

  return (
    <>
      <SEO 
        title="Vitana DEV — Webhooks" 
        description="Webhook management and delivery monitoring"
        canonical={window.location.href}
      />

      <SubNavigation items={devGatewayNavigation} />

      {spotlight ? (
        <ScreenFrame archetype="workspace">
          {devBody}
        </ScreenFrame>
      ) : (
        <div className="p-6 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to dark:from-background dark:via-background dark:to-background min-h-screen">{devBody}</div>
      )}
    </>
  );
}
