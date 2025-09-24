import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Plus, Brain, Zap, Package, Sparkles, Target, Users } from "lucide-react";
import { useState } from "react";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { SmartPackagePopup } from "@/components/SmartPackagePopup";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { StandardCard } from "@/components/templates/StandardCard";

function SmartPackage() {
  const [activeTab, setActiveTab] = useState("recommendations");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title="Smart Package Creator | Sharing" description="Use AI-powered recommendations to create intelligent health data packages optimized for your specific needs." />
      <SubNavigation items={sharingNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Smart Package Creator 🧠"
            description="AI-powered data package creation with intelligent recommendations based on your health profile"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search AI recommendations, templates, data types..." />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Package
            </Button>
          </UtilityActionButton>
      <SplitBar value={activeTab} onValueChange={setActiveTab}>
        <SplitBarList>
          <SplitBarTrigger value="recommendations">AI Recommendations</SplitBarTrigger>
          <SplitBarTrigger value="builder">Custom Builder</SplitBarTrigger>
          <SplitBarTrigger value="templates">Templates</SplitBarTrigger>
        </SplitBarList>

        <SplitBarContent value="recommendations">
          <div className="grid grid-cols-12 gap-4">
            {/* Row 1: Big + Small + Small (6+3+3) */}
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title="AI-Powered Recommendations"
                subtitle="Smart Package Suggestions"
                icon={Brain}
                content={
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">Cardiology Consultation Package</div>
                            <div className="text-xs text-muted-foreground">95% match - Heart rate data detected</div>
                          </div>
                          <div className="text-green-600 font-bold text-xs">95%</div>
                        </div>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">Annual Physical Package</div>
                            <div className="text-xs text-muted-foreground">92% match - Appointment scheduled</div>
                          </div>
                          <div className="text-green-600 font-bold text-xs">92%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title="AI Accuracy"
                subtitle="Prediction Score"
                icon={Target}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">94%</div>
                    <div className="text-xs text-muted-foreground">Match accuracy rate</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title="Package Types"
                subtitle="Available Options"
                icon={Package}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-blue-600">24</div>
                    <div className="text-xs text-muted-foreground">Data categories</div>
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
                title="Created Packages"
                subtitle="Your Library"
                icon={Users}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-purple-600">8</div>
                    <div className="text-xs text-muted-foreground">Packages ready</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title="Active Sharing"
                subtitle="Current Usage"
                icon={Zap}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-orange-600">3</div>
                    <div className="text-xs text-muted-foreground">Packages in use</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title="Recent AI Insights"
                subtitle="Latest Recommendations"
                icon={Sparkles}
                content={
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Detected upcoming cardiology appointment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Heart rate variability patterns analyzed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Research study eligibility matched</span>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </SplitBarContent>

        <SplitBarContent value="builder">
          <div className="grid grid-cols-12 gap-4">
            {/* Row 1: Single Full Row (12) */}
            <div className="col-span-12">
              <StandardCard
                title="Custom Package Builder"
                subtitle="Create Tailored Data Packages"
                icon={Package}
                content={
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Package Name</label>
                        <input 
                          type="text" 
                          className="w-full mt-1 p-2 border rounded-lg" 
                          placeholder="e.g., Cardiology Consultation Package"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Purpose/Recipient</label>
                        <input 
                          type="text" 
                          className="w-full mt-1 p-2 border rounded-lg" 
                          placeholder="e.g., Dr. Smith at Mayo Clinic"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <textarea 
                          className="w-full mt-1 p-2 border rounded-lg" 
                          rows={2}
                          placeholder="Describe the specific use case..."
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="font-medium text-sm">Data Type Selection</div>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {["Lab Results", "Vital Signs", "Activity Data", "Sleep Patterns", "Nutrition Tracking", "Medication History"].map((type) => (
                          <div key={type} className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">{type}</span>
                          </div>
                        ))}
                      </div>
                      <Button className="w-full mt-4">Generate AI Recommendations</Button>
                    </div>
                  </div>
                }
              />
            </div>

            {/* Row 2: Motivational Banner */}
            <div className="col-span-12">
              <MotivationalBanner variant="guidance" />
            </div>

            {/* Row 3: Big + Small + Small (6+3+3) */}
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title="Smart Suggestions"
                subtitle="AI-Powered Recommendations"
                icon={Brain}
                content={
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Include recent lab results for comprehensive view</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Add medication history for drug interactions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Include activity data for lifestyle assessment</span>
                    </div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title="Templates"
                subtitle="Quick Start"
                icon={Zap}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-blue-600">6</div>
                    <div className="text-xs text-muted-foreground">Available templates</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title="Data Types"
                subtitle="Available"
                icon={Package}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">24</div>
                    <div className="text-xs text-muted-foreground">Categories ready</div>
                  </div>
                }
              />
            </div>
          </div>
        </SplitBarContent>

        <SplitBarContent value="templates">
          <div className="grid grid-cols-12 gap-4">
            {/* Row 1: Small + Small + Big (3+3+6) */}
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title="Quick Templates"
                subtitle="Ready to Use"
                icon={Zap}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-blue-600">6</div>
                    <div className="text-xs text-muted-foreground">Pre-built packages</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title="Most Popular"
                subtitle="Community Favorite"
                icon={Users}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">89%</div>
                    <div className="text-xs text-muted-foreground">Success rate</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title="Package Templates Library"
                subtitle="Choose Your Starting Point"
                icon={Package}
                content={
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">General Health Checkup</div>
                          <div className="text-xs text-muted-foreground">Complete health overview for annual visits</div>
                        </div>
                        <Button size="sm" variant="outline">Use</Button>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">Specialist Consultation</div>
                          <div className="text-xs text-muted-foreground">Targeted data for specialist appointments</div>
                        </div>
                        <Button size="sm" variant="outline">Use</Button>
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

            {/* Row 3: Single Full Row (12) */}
            <div className="col-span-12">
              <StandardCard
                title="Advanced Template Features"
                subtitle="Coming Soon"
                icon={Sparkles}
                content={
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>AI-customized templates based on your data</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Dynamic templates that adapt to appointments</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>Collaborative templates with healthcare providers</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span>Smart template recommendations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>Template sharing with community</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <span>Version control and template history</span>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </SplitBarContent>
      </SplitBar>

          <SmartPackagePopup 
            isOpen={actionPopupOpen} 
            onClose={() => setActionPopupOpen(false)} 
          />
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(SmartPackage, SCREEN_IDS.SHARING_SMART_PACKAGE);