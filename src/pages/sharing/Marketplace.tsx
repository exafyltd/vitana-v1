import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Plus, Store, Star, Globe, Users, Zap, Building, Shield } from "lucide-react";
import { useState } from "react";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { BrowseServicesPopup } from "@/components/BrowseServicesPopup";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { StandardCard } from "@/components/templates/StandardCard";

function Marketplace() {
  const [activeTab, setActiveTab] = useState("featured");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title="Integration Marketplace | Sharing" description="Discover and connect with healthcare platforms, research studies, and wellness apps to maximize the value of your health data." />
      <SubNavigation items={sharingNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Integration Marketplace 🛒"
            description="Discover verified integrations to share your health data with trusted healthcare platforms and research studies"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search integrations, research studies, healthcare platforms..." />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
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
          <div className="grid grid-cols-12 gap-4">
            {/* Row 1: Big + Small + Small (6+3+3) */}
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title="Premium Healthcare Integrations"
                subtitle="Top-Rated Platforms"
                icon={Building}
                content={
                  <div className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">Epic MyChart Integration</div>
                          <div className="text-xs text-muted-foreground">4.8★ rating - 2.5M+ users - HIPAA compliant</div>
                        </div>
                        <div className="text-green-600 font-bold text-xs">Featured</div>
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">Stanford Medicine AI Lab</div>
                          <div className="text-xs text-muted-foreground">4.9★ rating - Research opportunity - Earn $50-200</div>
                        </div>
                        <div className="text-blue-600 font-bold text-xs">Research</div>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title="Available Apps"
                subtitle="Total Integrations"
                icon={Store}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-blue-600">127</div>
                    <div className="text-xs text-muted-foreground">Ready to connect</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title="Avg. Rating"
                subtitle="User Satisfaction"
                icon={Star}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-yellow-600">4.7★</div>
                    <div className="text-xs text-muted-foreground">Highly rated</div>
                  </div>
                }
              />
            </div>

            {/* Row 2: Motivational Banner */}
            <div className="col-span-12">
              <MotivationalBanner variant="encouragement" />
            </div>

            {/* Row 3: Small + Small + Big (3+3+6) */}
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title="Research Studies"
                subtitle="Active Programs"
                icon={Users}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">18</div>
                    <div className="text-xs text-muted-foreground">Opportunities</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title="Healthcare Platforms"
                subtitle="Medical Systems"
                icon={Shield}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-purple-600">24</div>
                    <div className="text-xs text-muted-foreground">HIPAA compliant</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title="Trending Integrations"
                subtitle="Most Popular This Month"
                icon={Zap}
                content={
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Fitbit Health Connect - Real-time sync active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Apple Health Integration - Seamless data flow</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Mayo Clinic Connect - Premium partnership</span>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </SplitBarContent>

        <SplitBarContent value="categories">
          <div className="grid grid-cols-12 gap-4">
            {/* Row 1: Single Full Row (12) */}
            <div className="col-span-12">
              <StandardCard
                title="Integration Categories"
                subtitle="Explore by Type"
                icon={Globe}
                content={
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="font-medium text-sm mb-3">Healthcare & Medical</div>
                      <div className="space-y-2">
                        <div className="flex justify-between p-2 bg-muted rounded">
                          <span className="text-sm">Healthcare Platforms</span>
                          <span className="text-xs text-muted-foreground">24 apps</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted rounded">
                          <span className="text-sm">Electronic Health Records</span>
                          <span className="text-xs text-muted-foreground">12 apps</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted rounded">
                          <span className="text-sm">Telemedicine Platforms</span>
                          <span className="text-xs text-muted-foreground">8 apps</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="font-medium text-sm mb-3">Research & Studies</div>
                      <div className="space-y-2">
                        <div className="flex justify-between p-2 bg-muted rounded">
                          <span className="text-sm">Medical Research</span>
                          <span className="text-xs text-muted-foreground">18 studies</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted rounded">
                          <span className="text-sm">Clinical Trials</span>
                          <span className="text-xs text-muted-foreground">7 studies</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted rounded">
                          <span className="text-sm">Population Health</span>
                          <span className="text-xs text-muted-foreground">5 studies</span>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>

            {/* Row 2: Motivational Banner */}
            <div className="col-span-12">
              <MotivationalBanner variant="partnership" />
            </div>

            {/* Row 3: Big + Small + Small (6+3+3) */}
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title="Popular Categories"
                subtitle="Most Connected This Month"
                icon={Star}
                content={
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Fitness & Activity Trackers (45% of users)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Electronic Health Records (38% of users)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Research Participation (22% of users)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>Wellness Apps (31% of users)</span>
                    </div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title="Total Categories"
                subtitle="Available Types"
                icon={Store}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-purple-600">8</div>
                    <div className="text-xs text-muted-foreground">Different categories</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title="New This Month"
                subtitle="Fresh Integrations"
                icon={Zap}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">5</div>
                    <div className="text-xs text-muted-foreground">Recently added</div>
                  </div>
                }
              />
            </div>
          </div>
        </SplitBarContent>

        <SplitBarContent value="connected">
          <div className="grid grid-cols-12 gap-4">
            {/* Row 1: Small + Small + Big (3+3+6) */}
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title="Active Connections"
                subtitle="Currently Connected"
                icon={Users}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">2</div>
                    <div className="text-xs text-muted-foreground">Apps connected</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title="Monthly Earnings"
                subtitle="Research Participation"
                icon={Star}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">$125</div>
                    <div className="text-xs text-muted-foreground">This month</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title="My Active Connections"
                subtitle="Currently Connected Platforms"
                icon={Globe}
                content={
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">Fitbit Health Connect</div>
                          <div className="text-xs text-muted-foreground">Connected 3 months ago - Real-time sync active</div>
                        </div>
                        <div className="text-green-600 text-xs font-bold">Active</div>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">Stanford Diabetes Study</div>
                          <div className="text-xs text-muted-foreground">Participating since 2 months - Earning rewards</div>
                        </div>
                        <div className="text-blue-600 text-xs font-bold">Research</div>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>

            {/* Row 2: Motivational Banner */}
            <div className="col-span-12">
              <MotivationalBanner variant="guidance" />
            </div>

            {/* Row 3: Single Full Row (12) */}
            <div className="col-span-12">
              <StandardCard
                title="Connection Management & Analytics"
                subtitle="Monitor Your Data Sharing"
                icon={Shield}
                content={
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div className="space-y-3">
                      <div className="font-medium">Data Sharing Summary</div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Data Shared</span>
                          <span className="font-medium">5.2 GB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sync Frequency</span>
                          <span className="font-medium">Real-time</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Activity</span>
                          <span className="font-medium">2 hours ago</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="font-medium">Connection Health</div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>All connections secure and encrypted</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Data sync operating normally</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>Research participation on track</span>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </SplitBarContent>
      </SplitBar>

          <BrowseServicesPopup 
            isOpen={actionPopupOpen} 
            onClose={() => setActionPopupOpen(false)} 
          />
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Marketplace, SCREEN_IDS.SHARING_MARKETPLACE);