import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Webhook, Send, Activity, Plus } from "lucide-react";
import { devGatewayNavigation } from "@/config/dev-navigation";

export default function GatewayWebhooks() {
  const [activeTab, setActiveTab] = useState("list");

  return (
    <>
      <SEO 
        title="Vitana DEV — Webhooks" 
        description="Webhook management and delivery monitoring"
        canonical={window.location.href}
      />

      <SubNavigation items={devGatewayNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
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
            <Button size="sm" disabled>
              <Plus className="w-4 h-4 mr-2" />
              New Webhook
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
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
      </div>
    </>
  );
}
