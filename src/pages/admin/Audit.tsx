import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, AlertTriangle, CheckCircle, Download, Filter } from "lucide-react";
import { adminMonitoringNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

const mockAuditLogs = [
  { id: "1", timestamp: "2024-12-15 14:32", user: "admin@vitana.com", action: "Patient Record Accessed", resource: "Patient ID: 12345", status: "success" },
  { id: "2", timestamp: "2024-12-15 14:28", user: "dr.wilson@vitana.com", action: "Lab Results Updated", resource: "Test ID: LAB789", status: "success" },
  { id: "3", timestamp: "2024-12-15 14:25", user: "nurse.smith@vitana.com", action: "Failed Login Attempt", resource: "Login Portal", status: "failure" }
];

function Audit() {
  return (
    <AppLayout>
      <SEO title="Audit Logs | Admin" description="View audit logs and compliance tracking" canonical={window.location.href} />
      <SubNavigation items={adminMonitoringNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title="Audit Logs & Compliance Tracking"
            description="Monitor system access, track changes, and ensure regulatory compliance"
            emoji="🔒"
          />

          {/* Compliance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-green-500" />
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
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">2,847</p>
                    <p className="text-sm text-muted-foreground">Audit Events</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">2,834</p>
                    <p className="text-sm text-muted-foreground">Successful Actions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">13</p>
                    <p className="text-sm text-muted-foreground">Security Alerts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="logs" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="logs">Audit Logs</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="security">Security Events</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="logs" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Recent Audit Events</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="space-y-0">
                    {mockAuditLogs.map((log, index) => (
                      <div key={log.id} className={`p-4 ${index !== mockAuditLogs.length - 1 ? 'border-b' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-muted-foreground font-mono">
                              {log.timestamp}
                            </div>
                            <div>
                              <p className="font-medium">{log.action}</p>
                              <p className="text-sm text-muted-foreground">User: {log.user} • Resource: {log.resource}</p>
                            </div>
                          </div>
                          <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                            {log.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="font-medium">HIPAA Compliance</span>
                      </div>
                      <p className="text-sm text-muted-foreground">All patient data access is logged and compliant</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="font-medium">Data Encryption</span>
                      </div>
                      <p className="text-sm text-muted-foreground">All data encrypted at rest and in transit</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Security Event Monitor</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Real-time security alerts and threat detection.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Generate compliance reports for regulatory audits.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Audit, SCREEN_IDS.ADMIN_AUDIT_LOGS);