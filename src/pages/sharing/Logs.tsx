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
import { ViewDetailsPopup } from "@/components/ViewDetailsPopup";

function Logs() {
  const [activeTab, setActiveTab] = useState("activity");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50";
      case "revoked":
        return "text-red-600 bg-red-50";
      case "pending":
        return "text-orange-600 bg-orange-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <AppLayout>
      <SEO 
        title="Logs & Revocation | Sharing" 
        description="Monitor all data sharing activities, view access logs, and manage revoked permissions with complete transparency."
      />
      <SubNavigation items={sharingNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title="Logs & Revocation 📋" 
            description="Complete transparency into your data sharing activities and access management"
          />
          
          <UtilityActionButton>
            <ExpandableSearchButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4" />
              View Details
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="activity">Activity Logs</SplitBarTrigger>
              <SplitBarTrigger value="revoked">Revoked Access</SplitBarTrigger>
              <SplitBarTrigger value="analytics">Analytics</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="activity">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">Recent Data Sharing Activity</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">Data Package Created</h4>
                          <p className="text-sm text-muted-foreground">Mayo Clinic Research - Jan 20, 2:30 PM</p>
                          <div className="flex gap-1 mt-1">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Lab Results</span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Vital Signs</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Completed</span>
                          <Button size="sm" variant="outline" className="ml-2">Details</Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">Consent Granted</h4>
                          <p className="text-sm text-muted-foreground">Stanford Medicine AI Lab - Jan 20, 9:15 AM</p>
                          <div className="flex gap-1 mt-1">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Heart Rate</span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Blood Pressure</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Completed</span>
                          <Button size="sm" variant="outline" className="ml-2">Details</Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">Data Access</h4>
                          <p className="text-sm text-muted-foreground">Vitana Health Research - Jan 19, 4:45 PM</p>
                          <div className="flex gap-1 mt-1">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">ECG Data</span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">BP Trends</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Completed</span>
                          <Button size="sm" variant="outline" className="ml-2">Details</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-4">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">Activity Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Activities</span>
                        <span className="font-medium">47</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data Packages Shared</span>
                        <span className="font-medium">12</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">This Week</span>
                        <span className="font-medium">5</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="revoked">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">Revoked Data Access</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div>
                          <h4 className="font-medium">Diabetes Research Consortium</h4>
                          <p className="text-sm text-muted-foreground">Revoked Jan 18 - Study completion</p>
                          <div className="flex gap-1 mt-1">
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Glucose Data</span>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Diet Tracking</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Revoked</span>
                          <Button size="sm" variant="outline" className="ml-2">View History</Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div>
                          <h4 className="font-medium">Mental Health Analytics Inc.</h4>
                          <p className="text-sm text-muted-foreground">Revoked Jan 10 - Privacy concerns</p>
                          <div className="flex gap-1 mt-1">
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Sleep Data</span>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Stress Levels</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Restorable</span>
                          <Button size="sm" variant="outline" className="ml-2">Restore</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-4">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">Revocation Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Revoked</span>
                        <span className="font-medium">3</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Can Restore</span>
                        <span className="font-medium">1</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Permanently Revoked</span>
                        <span className="font-medium">2</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="analytics">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-12">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">Data Sharing Analytics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">47</div>
                        <div className="text-sm text-muted-foreground">Total Activities</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">12</div>
                        <div className="text-sm text-muted-foreground">Packages Shared</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">8</div>
                        <div className="text-sm text-muted-foreground">Active Consents</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">3</div>
                        <div className="text-sm text-muted-foreground">Revoked Access</div>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-center">Detailed analytics and trends coming soon...</p>
                  </div>
                </div>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <ViewDetailsPopup 
        isOpen={actionPopupOpen} 
        onClose={() => setActionPopupOpen(false)} 
      />
    </AppLayout>
  );
}

export default withScreenId(Logs, SCREEN_IDS.SHARING_LOGS);