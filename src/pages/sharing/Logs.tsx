import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { FileText, AlertTriangle, Search, Download, Filter, Eye, Trash2, Calendar } from "lucide-react";
import { useState } from "react";

const logsData = {
  activityLogs: [
    {
      id: 1,
      timestamp: "2024-01-20 14:30:15",
      action: "Data Package Created",
      details: "Comprehensive Health Profile package created for Mayo Clinic Research",
      dataTypes: ["Lab Results", "Vital Signs", "Activity Data"],
      recipient: "Mayo Clinic Research Network",
      status: "completed"
    },
    {
      id: 2,
      timestamp: "2024-01-20 09:15:42",
      action: "Consent Granted",
      details: "Approved data sharing request from Stanford Medicine AI Lab",
      dataTypes: ["Heart Rate", "Blood Pressure", "Exercise Data"],
      recipient: "Stanford Medicine AI Lab",
      status: "completed"
    },
    {
      id: 3,
      timestamp: "2024-01-19 16:45:28",
      action: "Data Access",
      details: "Vitana Health Research Institute accessed cardiovascular data",
      dataTypes: ["ECG Data", "Blood Pressure Trends"],
      recipient: "Vitana Health Research Institute",
      status: "completed"
    },
    {
      id: 4,
      timestamp: "2024-01-19 11:20:55",
      action: "Integration Connected",
      details: "Successfully connected Fitbit Health Connect integration",
      dataTypes: ["Activity Data", "Heart Rate", "Sleep Patterns"],
      recipient: "Fitbit (Google)",
      status: "completed"
    },
    {
      id: 5,
      timestamp: "2024-01-18 13:12:33",
      action: "Consent Revoked",
      details: "Revoked data sharing access for expired research study",
      dataTypes: ["Glucose Data", "Diet Tracking"],
      recipient: "Diabetes Research Consortium",
      status: "revoked"
    }
  ],
  revokedAccess: [
    {
      id: 1,
      organization: "Diabetes Research Consortium",
      originalPurpose: "Type 2 Diabetes Prevention Study",
      revokedDate: "2024-01-18",
      revokedReason: "Study completion",
      dataTypes: ["Glucose Data", "Diet Tracking", "Weight Measurements"],
      canRestore: false
    },
    {
      id: 2,
      organization: "Mental Health Analytics Inc.",
      originalPurpose: "Stress and Sleep Pattern Analysis",
      revokedDate: "2024-01-10",
      revokedReason: "User request - privacy concerns",
      dataTypes: ["Sleep Data", "Stress Levels", "Activity Patterns"],
      canRestore: true
    },
    {
      id: 3,
      organization: "Generic Wellness Corp",
      originalPurpose: "General wellness optimization",
      revokedDate: "2024-01-05",
      revokedReason: "Violation of data use agreement",
      dataTypes: ["Complete Health Profile"],
      canRestore: false
    }
  ]
};

function Logs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState("all");

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
        title="Logs & Revocation - Vitana Sharing" 
        description="Monitor all data sharing activities, view access logs, and manage revoked permissions with complete transparency."
      />
      <SubNavigation items={sharingNavigation} />
      
      <div className="px-6 py-8 space-y-8">
        <StandardHeader 
          title="Logs & Revocation"
          description="Complete transparency into your data sharing activities and access management"
        />

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search activity logs..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Date Range
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="activity">Activity Logs</TabsTrigger>
            <TabsTrigger value="revoked">Revoked Access</TabsTrigger>
          </TabsList>
          
          <TabsContent value="activity" className="space-y-6">
            {/* Activity Logs */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Data Sharing Activity</h2>
              </div>
              
              <div className="space-y-4">
                {logsData.activityLogs.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-medium">{log.action}</div>
                            <Badge 
                              variant="outline" 
                              className={`${getStatusColor(log.status)} border-0`}
                            >
                              {log.status}
                            </Badge>
                            <div className="text-sm text-muted-foreground">{log.timestamp}</div>
                          </div>
                          
                          <div className="text-sm text-muted-foreground mb-3">
                            {log.details}
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">Recipient</div>
                              <div className="text-sm">{log.recipient}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">Data Types</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {log.dataTypes.map((type, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                          {log.status === "completed" && (
                            <Button variant="outline" size="sm">
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="revoked" className="space-y-6">
            {/* Revoked Access */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold">Revoked Data Access</h2>
              </div>
              
              <div className="space-y-4">
                {logsData.revokedAccess.map((revoked) => (
                  <Card key={revoked.id} className="border-red-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-medium">{revoked.organization}</div>
                            <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">
                              Access Revoked
                            </Badge>
                            <div className="text-sm text-muted-foreground">
                              Revoked on {revoked.revokedDate}
                            </div>
                          </div>
                          
                          <div className="text-sm text-muted-foreground mb-3">
                            Original Purpose: {revoked.originalPurpose}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">Revocation Reason</div>
                              <div className="text-sm">{revoked.revokedReason}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">Data Types</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {revoked.dataTypes.map((type, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">Status</div>
                              <div className="text-sm">
                                {revoked.canRestore ? "Can be restored" : "Permanently revoked"}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View History
                          </Button>
                          {revoked.canRestore ? (
                            <Button size="sm">
                              Restore Access
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Record
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">47</div>
                <div className="text-sm text-muted-foreground">Total Activities</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">12</div>
                <div className="text-sm text-muted-foreground">Data Packages Shared</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">3</div>
                <div className="text-sm text-muted-foreground">Access Revoked</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">8</div>
                <div className="text-sm text-muted-foreground">Active Consents</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Logs, SCREEN_IDS.SHARING_LOGS);