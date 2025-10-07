import React from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Plug, Store, Plus } from "lucide-react";

export default withScreenId(function Integrations() {
  const [connectPopupOpen, setConnectPopupOpen] = React.useState(false);

  return (
    <AppLayout>
      <SEO
        title="Integrations | VITANA"
        description="Connect and manage third-party integrations"
        canonical={window.location.href}
      />
      <SubNavigation items={sharingNavigation} />

      <div className="p-6 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="Integrations 🔌"
            description="Connect with external platforms and services"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search integrations, connections..."
            />
            <UniversalCalendarButton />
            <Button size="sm" variant="default" onClick={() => setConnectPopupOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Connect Channel
            </Button>
          </UtilityActionButton>

          {/* Two Split Screens: 50/50 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: My Connections */}
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plug className="w-5 h-5" />
                  My Connections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Coming soon: Manage connected channels and services
                </p>
              </CardContent>
            </Card>

            {/* Right: Marketplace */}
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Marketplace
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Coming soon: Discover and connect new integrations
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Connect Channel Popup */}
      {connectPopupOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Connect Channel</h2>
            <p className="text-sm text-muted-foreground mb-4">Channel connection coming soon...</p>
            <Button onClick={() => setConnectPopupOpen(false)} className="w-full">
              Close
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}, SCREEN_IDS.SHARING_OVERVIEW);
