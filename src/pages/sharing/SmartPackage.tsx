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
import { SmartPackagePopup } from "@/components/SmartPackagePopup";

function SmartPackage() {
  const [activeTab, setActiveTab] = useState("recommendations");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO 
        title="Smart Package Creator | Sharing" 
        description="Use AI-powered recommendations to create intelligent health data packages optimized for your specific needs."
      />
      <SubNavigation items={sharingNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title="Smart Package Creator 🧠" 
            description="AI-powered data package creation with intelligent recommendations based on your health profile"
          />
          
          <UtilityActionButton>
            <ExpandableSearchButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4" />
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
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">AI-Powered Package Suggestions</h3>
                    <p className="text-muted-foreground mb-6">Based on your health profile, upcoming appointments, and data patterns, here are intelligent package recommendations.</p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">Cardiology Consultation Package</h4>
                          <p className="text-sm text-muted-foreground">95% match - Based on heart rate variability data</p>
                        </div>
                        <Button size="sm" variant="outline">View Details</Button>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">Annual Physical Exam Package</h4>
                          <p className="text-sm text-muted-foreground">92% match - Upcoming appointment detected</p>
                        </div>
                        <Button size="sm" variant="outline">View Details</Button>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">Diabetes Prevention Study</h4>
                          <p className="text-sm text-muted-foreground">88% match - Research criteria match</p>
                        </div>
                        <Button size="sm" variant="outline">View Details</Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-4">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Available Data Types</span>
                        <span className="font-medium">24</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created Packages</span>
                        <span className="font-medium">8</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">AI Accuracy</span>
                        <span className="font-medium">94%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="builder">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-6">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">Package Configuration</h3>
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
                          rows={3}
                          placeholder="Describe the specific use case..."
                        />
                      </div>
                      <Button className="w-full">Generate AI Recommendations</Button>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-6">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">Data Type Selection</h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {["Lab Results", "Vital Signs", "Activity Data", "Sleep Patterns", "Nutrition Tracking", "Medication History"].map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm">{type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="templates">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-12">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">Package Templates</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">General Health Checkup</h4>
                        <p className="text-sm text-muted-foreground mb-3">Complete health overview for annual visits</p>
                        <Button size="sm" variant="outline" className="w-full">Use Template</Button>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Specialist Consultation</h4>
                        <p className="text-sm text-muted-foreground mb-3">Targeted data for specialist appointments</p>
                        <Button size="sm" variant="outline" className="w-full">Use Template</Button>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Research Participation</h4>
                        <p className="text-sm text-muted-foreground mb-3">Comprehensive data for research studies</p>
                        <Button size="sm" variant="outline" className="w-full">Use Template</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <SmartPackagePopup 
        isOpen={actionPopupOpen} 
        onClose={() => setActionPopupOpen(false)} 
      />
    </AppLayout>
  );
}

export default withScreenId(SmartPackage, SCREEN_IDS.SHARING_SMART_PACKAGE);