import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";
import { DevTabs } from "@/components/dev/DevTabs";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import SEO from "@/components/SEO";
import { Key, Flag, Users } from "lucide-react";

export default function DevSettings() {
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

  const tabs = [
    {
      value: "environment",
      label: "Environment",
      content: environmentContent
    },
    {
      value: "auth",
      label: "Auth",
      content: <DevEmptyState 
        title="Authentication Settings" 
        description="View Supabase authentication configuration and enabled providers."
        icon={Key}
      />
    },
    {
      value: "flags",
      label: "Feature Flags",
      content: <DevEmptyState 
        title="Feature Flags" 
        description="Manage Dev Hub feature flags and environment variables."
        icon={Flag}
      />
    },
    {
      value: "tenants",
      label: "Tenants",
      content: <DevEmptyState 
        title="Tenant Configuration" 
        description="View and manage tenant configurations (System, Maxina, Earthlinks, AlKalma)."
        icon={Users}
      />
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <SEO 
        title="Vitana DEV — Settings" 
        description="Configuration settings for Dev Hub"
        canonical={window.location.href}
      />
      
      <DevTabs defaultTab="environment" tabs={tabs} />
    </div>
  );
}
