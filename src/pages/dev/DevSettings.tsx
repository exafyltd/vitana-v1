import { DevHubHeader } from "@/components/dev/DevHubHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";

export default function DevSettings() {
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Vitana DEV — Settings" 
        description="Configuration settings for Vitana command hub"
        canonical={window.location.href}
      />
      
      <DevHubHeader />
      
      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Environment Configuration</CardTitle>
            <CardDescription>Read-only view of Dev Hub configuration (no secrets displayed)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Dev Hub Enabled</span>
                <Badge variant={DEV_HUB_CONFIG.enabled ? "default" : "secondary"}>
                  {DEV_HUB_CONFIG.enabled ? "Yes" : "No"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Read-Only Mode</span>
                <Badge variant={DEV_HUB_CONFIG.readonly ? "secondary" : "default"}>
                  {DEV_HUB_CONFIG.readonly ? "Active (Phase 1)" : "Disabled"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Gateway Base URL</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {DEV_HUB_CONFIG.gatewayBase}
                </code>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Events Refresh Interval</span>
                <Badge variant="outline">{DEV_HUB_CONFIG.eventsRefreshInterval / 1000}s</Badge>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">VTID Refresh Interval</span>
                <Badge variant="outline">{DEV_HUB_CONFIG.vtidRefreshInterval / 1000}s</Badge>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Max Recent Events</span>
                <Badge variant="outline">{DEV_HUB_CONFIG.maxRecentEvents}</Badge>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Max Recent VTIDs</span>
                <Badge variant="outline">{DEV_HUB_CONFIG.maxRecentVTIDs}</Badge>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Environment Variables</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li><code>VITE_DEV_HUB_ENABLED</code> — Toggle Dev Hub feature</li>
                <li><code>VITE_DEV_HUB_READONLY</code> — Toggle read-only mode</li>
                <li><code>VITE_GATEWAY_BASE</code> — Gateway API base URL</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
