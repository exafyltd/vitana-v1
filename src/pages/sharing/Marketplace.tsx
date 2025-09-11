import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { BrowseServicesPopup } from "@/components/BrowseServicesPopup";

function Marketplace() {
  const [activeTab, setActiveTab] = useState("featured");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO 
        title="Integration Marketplace | Sharing" 
        description="Discover and connect with healthcare platforms, research studies, and wellness apps to maximize the value of your health data."
      />
      <SubNavigation items={sharingNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title="Integration Marketplace 🛒" 
            description="Discover verified integrations to share your health data with trusted healthcare platforms and research studies"
          />
          
          <UtilityActionButton>
            <ExpandableSearchButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4" />
              Browse Services
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="featured">Featured Integrations</SplitBarTrigger>
              <SplitBarTrigger value="categories">Categories</SplitBarTrigger>
              <SplitBarTrigger value="connected">My Connections</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="featured">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">Premium Healthcare Integrations</h3>
                    <p className="text-muted-foreground mb-6">Connect with top-rated healthcare platforms and research institutions.</p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">Epic MyChart Integration</h4>
                          <p className="text-sm text-muted-foreground">4.8★ rating - 2.5M+ users - HIPAA compliant</p>
                        </div>
                        <Button size="sm" variant="outline">Connect Now</Button>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">Stanford Medicine AI Lab</h4>
                          <p className="text-sm text-muted-foreground">4.9★ rating - Research opportunity - Earn $50-200</p>
                        </div>
                        <Button size="sm" variant="outline">Learn More</Button>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">Fitbit Health Connect</h4>
                          <p className="text-sm text-muted-foreground">4.6★ rating - 1.8M+ users - Real-time sync</p>
                        </div>
                        <Button size="sm" variant="outline">Connect Now</Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-4">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">Integration Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Available Integrations</span>
                        <span className="font-medium">127</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Research Studies</span>
                        <span className="font-medium">18</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Healthcare Platforms</span>
                        <span className="font-medium">24</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg. User Rating</span>
                        <span className="font-medium">4.7★</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="categories">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-6">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">Healthcare & Medical</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span>Healthcare Platforms</span>
                        <span className="text-sm text-muted-foreground">24 apps</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span>Electronic Health Records</span>
                        <span className="text-sm text-muted-foreground">12 apps</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span>Telemedicine Platforms</span>
                        <span className="text-sm text-muted-foreground">8 apps</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-6">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">Research & Studies</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span>Medical Research</span>
                        <span className="text-sm text-muted-foreground">18 studies</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span>Clinical Trials</span>
                        <span className="text-sm text-muted-foreground">7 studies</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span>Population Health</span>
                        <span className="text-sm text-muted-foreground">5 studies</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="connected">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">Active Connections</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div>
                          <h4 className="font-medium">Fitbit Health Connect</h4>
                          <p className="text-sm text-muted-foreground">Connected 3 months ago - Real-time sync active</p>
                        </div>
                        <Button size="sm" variant="outline">Manage</Button>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div>
                          <h4 className="font-medium">Stanford Diabetes Study</h4>
                          <p className="text-sm text-muted-foreground">Participating since 2 months - Earning rewards</p>
                        </div>
                        <Button size="sm" variant="outline">View Details</Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-4">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">Connection Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Active Connections</span>
                        <span className="font-medium">2</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data Shared</span>
                        <span className="font-medium">5.2 GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Earnings This Month</span>
                        <span className="font-medium text-green-600">$125</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <BrowseServicesPopup 
        isOpen={actionPopupOpen} 
        onClose={() => setActionPopupOpen(false)} 
      />
    </AppLayout>
  );
}

export default withScreenId(Marketplace, SCREEN_IDS.SHARING_MARKETPLACE);