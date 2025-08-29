import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Shield, Eye, Settings, Clock, AlertTriangle, CheckCircle } from "lucide-react";

const consentData = {
  activeConsents: [
    {
      id: 1,
      organization: "Vitana Health Research Institute",
      purpose: "Health Analytics & Personalized Recommendations",
      dataTypes: ["Health Tracking", "Lab Results", "Activity Data"],
      grantedDate: "2024-01-15",
      expiryDate: "2024-07-15",
      status: "active",
      canRevoke: true
    },
    {
      id: 2,
      organization: "Mayo Clinic Research Network",
      purpose: "Chronic Disease Prevention Study",
      dataTypes: ["Biomarkers", "Medical History", "Lifestyle Data"],
      grantedDate: "2024-01-10",
      expiryDate: "2024-12-31",
      status: "active",
      canRevoke: true
    },
    {
      id: 3,
      organization: "Stanford Medicine AI Lab",
      purpose: "Cardiovascular Risk Assessment Model",
      dataTypes: ["Heart Rate", "Blood Pressure", "Exercise Data"],
      grantedDate: "2024-01-05",
      expiryDate: "2025-01-05",
      status: "active",
      canRevoke: false
    }
  ],
  pendingRequests: [
    {
      id: 4,
      organization: "Johns Hopkins Digital Health Center",
      purpose: "Diabetes Prevention Program",
      dataTypes: ["Glucose Data", "Diet Tracking", "Weight Measurements"],
      requestedDate: "2024-01-20",
      expiryDate: "2024-06-20"
    },
    {
      id: 5,
      organization: "Harvard T.H. Chan School of Public Health",
      purpose: "Environmental Health Impact Study",
      dataTypes: ["Location Data", "Air Quality Exposure", "Health Symptoms"],
      requestedDate: "2024-01-18",
      expiryDate: "2025-01-18"
    }
  ]
};

function Consent() {
  return (
    <AppLayout>
      <SEO 
        title="Consent Dashboard - Vitana Sharing" 
        description="Manage your data sharing consents, view active permissions, and control how your health data is used."
      />
      <SubNavigation items={sharingNavigation} />
      
      <div className="px-6 py-8 space-y-8">
        <StandardHeader 
          title="Consent Dashboard"
          description="Control and monitor how your health data is shared with research institutions and healthcare providers"
        />

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Consents</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{consentData.activeConsents.length}</div>
              <p className="text-xs text-muted-foreground">Organizations with access</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{consentData.pendingRequests.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting your decision</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Protection</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">100%</div>
              <p className="text-xs text-muted-foreground">Encrypted & secured</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Consents */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold">Active Consents</h2>
          </div>
          
          <div className="space-y-4">
            {consentData.activeConsents.map((consent) => (
              <Card key={consent.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{consent.organization}</CardTitle>
                      <CardDescription>{consent.purpose}</CardDescription>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Data Types Shared</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {consent.dataTypes.map((type, index) => (
                          <Badge key={index} variant="outline" className="text-xs">{type}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Access Period</div>
                      <div className="text-sm">{consent.grantedDate} to {consent.expiryDate}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch disabled={!consent.canRevoke} />
                        <span className="text-sm">Data sharing enabled</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {consent.canRevoke ? (
                        <Button variant="outline" size="sm">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Revoke Access
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          Cannot Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pending Requests */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <h2 className="text-xl font-semibold">Pending Requests</h2>
          </div>
          
          <div className="space-y-4">
            {consentData.pendingRequests.map((request) => (
              <Card key={request.id} className="border-orange-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{request.organization}</CardTitle>
                      <CardDescription>{request.purpose}</CardDescription>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Requested Data Types</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {request.dataTypes.map((type, index) => (
                          <Badge key={index} variant="outline" className="text-xs">{type}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Proposed Access Period</div>
                      <div className="text-sm">{request.requestedDate} to {request.expiryDate}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm text-muted-foreground">
                      Requested on {request.requestedDate}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Review Details
                      </Button>
                      <Button size="sm">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button variant="outline" size="sm">
                        Decline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            Privacy Settings
          </Button>
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            View All Activity
          </Button>
          <Button variant="outline">Download Consent History</Button>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Consent, SCREEN_IDS.SHARING_CONSENT);