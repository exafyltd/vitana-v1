import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Key, Flag, Users, Plus } from "lucide-react";
import { devSettingsNavigation } from "@/config/dev-navigation";

export default function DevSettings() {
  const [activeTab, setActiveTab] = useState("environment");

  const environmentContent = (
    <Card>
      <CardHeader>
        <CardTitle>Environment Configuration</CardTitle>
        <CardDescription>
          Read-only view of current Dev Hub settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-1">Dev Hub Enabled</div>
            <Badge variant={DEV_HUB_CONFIG.enabled ? "default" : "secondary"}>
              {DEV_HUB_CONFIG.enabled ? "Yes" : "No"}
            </Badge>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">Read-Only Mode</div>
            <Badge variant={DEV_HUB_CONFIG.readonly ? "secondary" : "default"}>
              {DEV_HUB_CONFIG.readonly ? "Yes" : "No"}
            </Badge>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">Gateway Base URL</div>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {DEV_HUB_CONFIG.gatewayBase}
            </code>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">Events Refresh Interval</div>
            <Badge variant="outline">
              {DEV_HUB_CONFIG.eventsRefreshInterval / 1000}s
            </Badge>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">VTID Refresh Interval</div>
            <Badge variant="outline">
              {DEV_HUB_CONFIG.vtidRefreshInterval / 1000}s
            </Badge>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">Max Recent Events</div>
            <Badge variant="outline">
              {DEV_HUB_CONFIG.maxRecentEvents}
            </Badge>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">Max Recent VTIDs</div>
            <Badge variant="outline">
              {DEV_HUB_CONFIG.maxRecentVTIDs}
            </Badge>
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <div className="text-sm font-medium mb-2">Environment Variables</div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>VITE_DEV_HUB_ENABLED</div>
            <div>VITE_DEV_HUB_READONLY</div>
            <div>VITE_GATEWAY_BASE</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <SEO 
        title="Vitana DEV — Settings" 
        description="Configuration settings for Dev Hub"
        canonical={window.location.href}
      />

      {/* Horizontal Navigation */}
      <SubNavigation items={devSettingsNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* 3-Card Header */}
          <DevStandardHeader 
            title="Settings"
            description="Configure Dev Hub environment, authentication, and features"
            emoji="⚙️"
          />

          {/* Utility Action Buttons */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search settings…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Config
            </Button>
          </UtilityActionButton>

          {/* Split-Screen Navigation Bar */}
          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="environment">Environment</SplitBarTrigger>
              <SplitBarTrigger value="auth">Auth</SplitBarTrigger>
              <SplitBarTrigger value="flags">Feature Flags</SplitBarTrigger>
              <SplitBarTrigger value="tenants">Tenants</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="environment" className="mt-6">
              {environmentContent}
            </SplitBarContent>

            <SplitBarContent value="auth" className="mt-6">
              <DevEmptyState 
                title="Authentication Settings" 
                description="View Supabase authentication configuration and enabled providers."
                icon={Key}
              />
            </SplitBarContent>

            <SplitBarContent value="flags" className="mt-6">
              <DevEmptyState 
                title="Feature Flags" 
                description="Manage Dev Hub feature flags and environment variables."
                icon={Flag}
              />
            </SplitBarContent>

            <SplitBarContent value="tenants" className="mt-6">
              <DevEmptyState 
                title="Tenant Configuration" 
                description="View and manage tenant configurations (System, Maxina, Earthlinks, AlKalma)."
                icon={Users}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
