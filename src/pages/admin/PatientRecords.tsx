import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, Clock, Shield, Eye } from "lucide-react";
import { adminNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

const mockPatients = [
  { id: "1", name: "Sarah Johnson", dob: "1985-03-15", lastVisit: "2024-12-10", recordCount: 12 },
  { id: "2", name: "Mike Chen", dob: "1990-07-22", lastVisit: "2024-12-08", recordCount: 8 },
  { id: "3", name: "Lisa Park", dob: "1988-11-03", lastVisit: "2024-12-05", recordCount: 15 }
];

function PatientRecords() {
  return (
    <AppLayout>
      <SEO title="Patient Records | Admin" description="View and manage patient medical records" canonical={window.location.href} />
      <SubNavigation items={adminNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Patient Record Viewer"
            description="Secure access to patient medical records and health data"
            emoji="📋"
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">1,247</p>
                    <p className="text-sm text-muted-foreground">Total Records</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">156</p>
                    <p className="text-sm text-muted-foreground">Recent Updates</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">100%</p>
                    <p className="text-sm text-muted-foreground">HIPAA Compliant</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Eye className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">43</p>
                    <p className="text-sm text-muted-foreground">Views Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="search">Patient Search</TabsTrigger>
              <TabsTrigger value="recent">Recent Records</TabsTrigger>
              <TabsTrigger value="audit">Access Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Search Patient Records</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input placeholder="Search by name, DOB, or patient ID..." className="flex-1" />
                    <Button>
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {mockPatients.map((patient) => (
                      <div key={patient.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{patient.name}</p>
                          <p className="text-sm text-muted-foreground">DOB: {patient.dob} • Last Visit: {patient.lastVisit}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{patient.recordCount} records</span>
                          <Button size="sm" variant="outline">View Records</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recent" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recently Accessed Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Recently viewed patient records for quick access.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Access Audit Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">HIPAA-compliant access logs and audit trail.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(PatientRecords, SCREEN_IDS.ADMIN_PATIENT_RECORDS);