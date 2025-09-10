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
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { StandardCard } from "@/components/templates/StandardCard";
import { VideoFeedCard } from "@/components/crossover/VideoFeedCard";
import ConsentPackagePopup from "@/components/ConsentPackagePopup";
import { Share2, Users, Shield, Database, FileText, Globe } from "lucide-react";

export default withScreenId(function Sharing() {
  const [activeTab, setActiveTab] = useState("consent");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title="Sharing Overview | VITANA" description="Share your wellness journey and manage data consent packages securely" canonical={window.location.href} />
      <SubNavigation items={sharingNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Sharing Overview 📱"
            description="Securely share your wellness journey with healthcare providers and the community"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search consent packages, sharing settings..." />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Sharing Actions
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="consent">Consent & Privacy</SplitBarTrigger>
              <SplitBarTrigger value="community">Community Sharing</SplitBarTrigger>
              <SplitBarTrigger value="integrations">Integrations</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="consent">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Big + Small + Small (6+3+3) */}
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Data Consent Manager"
                    subtitle="Control Your Health Data Sharing"
                    icon={Shield}
                    content={
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">3</div>
                            <div className="text-xs text-muted-foreground">Active Packages</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">7</div>
                            <div className="text-xs text-muted-foreground">Shared Providers</div>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Dr. Roberts - Cardiology</span>
                            <span className="text-green-600">Active</span>
                          </div>
                          <div className="flex justify-between">
                            <span>VITANA Research Lab</span>
                            <span className="text-orange-600">Pending</span>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Privacy Score"
                    subtitle="Data Protection Level"
                    icon={Database}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">95%</div>
                        <div className="text-xs text-muted-foreground">Excellent protection</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Consent Packages"
                    subtitle="Ready to Share"
                    icon={FileText}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">5</div>
                        <div className="text-xs text-muted-foreground">Packages created</div>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="partnership" />
                </div>

                {/* Row 3: Small + Small + Big (3+3+6) */}
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Recent Activity"
                    subtitle="Last 7 Days"
                    icon={Globe}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-purple-600">12</div>
                        <div className="text-xs text-muted-foreground">Data requests</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Expiring Soon"
                    subtitle="Consent Packages"
                    icon={FileText}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-orange-600">2</div>
                        <div className="text-xs text-muted-foreground">Need renewal</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <VideoFeedCard />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="community">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Single Full Row (12) */}
                <div className="col-span-12">
                  <StandardCard
                    title="Community Sharing Hub"
                    subtitle="Share Your Wellness Journey"
                    icon={Users}
                    content={
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-blue-600">127</div>
                            <div className="text-xs text-muted-foreground">Followers</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">89</div>
                            <div className="text-xs text-muted-foreground">Following</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-600">45</div>
                            <div className="text-xs text-muted-foreground">Posts Shared</div>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Progress sharing enabled</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>Achievement notifications active</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span>Community challenges joined</span>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="encouragement" />
                </div>

                {/* Row 3: Big + Small + Small (6+3+3) */}
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Coming Soon"
                    subtitle="Enhanced Sharing Features"
                    icon={Share2}
                    content={
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Social media integration</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Progress milestone sharing</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>Community achievement badges</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span>Group challenge participation</span>
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Social Score"
                    subtitle="Community Impact"
                    icon={Users}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">8.4</div>
                        <div className="text-xs text-muted-foreground">Engagement rating</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Inspirations"
                    subtitle="Weekly Reach"
                    icon={Globe}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-purple-600">234</div>
                        <div className="text-xs text-muted-foreground">People inspired</div>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="integrations">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Small + Small + Big (3+3+6) */}
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Connected Apps"
                    subtitle="Data Sources"
                    icon={Globe}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">4</div>
                        <div className="text-xs text-muted-foreground">Active integrations</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="API Requests"
                    subtitle="This Month"
                    icon={Database}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">1.2K</div>
                        <div className="text-xs text-muted-foreground">Data exchanges</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Integration Marketplace"
                    subtitle="Available Connections"
                    icon={Globe}
                    content={
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="font-medium text-sm">Healthcare Providers</div>
                            <div className="text-xs text-muted-foreground">Epic, Cerner, Allscripts</div>
                          </div>
                          <div className="space-y-2">
                            <div className="font-medium text-sm">Fitness Platforms</div>
                            <div className="text-xs text-muted-foreground">Apple Health, Fitbit, Garmin</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="font-medium text-sm">Research Platforms</div>
                          <div className="text-xs text-muted-foreground">VITANA Labs, Partner Institutions</div>
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
                    title="Coming Soon: Advanced Integration Features"
                    subtitle="Next Generation Data Sharing"
                    icon={Share2}
                    content={
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span>Real-time data streaming</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>AI-powered consent suggestions</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span>Automated privacy compliance</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span>Multi-platform synchronization</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span>Blockchain-verified sharing</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                              <span>Smart contract automation</span>
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

          <ConsentPackagePopup 
            open={actionPopupOpen} 
            onOpenChange={setActionPopupOpen}
          />
        </div>
      </div>
    </AppLayout>
  );
}, SCREEN_IDS.SHARING_OVERVIEW);