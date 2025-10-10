import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, UserCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { adminClinicalNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

const mockQueueData = {
  waitingRoom: [
    { id: "1", name: "Sarah Johnson", appointment: "2:30 PM", type: "Consultation", waitTime: "12 min", status: "waiting" },
    { id: "2", name: "Mike Chen", appointment: "2:45 PM", type: "Follow-up", waitTime: "8 min", status: "waiting" },
    { id: "3", name: "Lisa Park", appointment: "3:00 PM", type: "Lab Review", waitTime: "3 min", status: "ready" }
  ],
  inProgress: [
    { id: "4", name: "John Davis", appointment: "2:15 PM", type: "Consultation", provider: "Dr. Wilson", room: "Room 2" },
    { id: "5", name: "Emma Brown", appointment: "2:00 PM", type: "Therapy", provider: "Dr. Smith", room: "Room 1" }
  ]
};

function Queue() {
  return (
    <AppLayout>
      <SEO title="Queue & Check-In | Admin" description="Manage patient queue and check-in process" canonical={window.location.href} />
      <SubNavigation items={adminClinicalNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title="Queue & Check-In Management"
            description="Monitor patient flow and manage the check-in process"
            emoji="🏥"
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">8</p>
                    <p className="text-sm text-muted-foreground">Avg Wait (min)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">23</p>
                    <p className="text-sm text-muted-foreground">In Queue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">5</p>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">47</p>
                    <p className="text-sm text-muted-foreground">Completed Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="queue" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="queue">Live Queue</TabsTrigger>
              <TabsTrigger value="checkin">Check-In</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="queue" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-500" />
                      Waiting Room ({mockQueueData.waitingRoom.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {mockQueueData.waitingRoom.map((patient) => (
                      <div key={patient.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{patient.name}</p>
                          <p className="text-sm text-muted-foreground">{patient.appointment} • {patient.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={patient.status === 'ready' ? 'default' : 'secondary'}>
                            {patient.waitTime}
                          </Badge>
                          <Button size="sm" variant="outline">Call In</Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-green-500" />
                      In Progress ({mockQueueData.inProgress.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {mockQueueData.inProgress.map((patient) => (
                      <div key={patient.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                        <div>
                          <p className="font-medium">{patient.name}</p>
                          <p className="text-sm text-muted-foreground">{patient.provider} • {patient.room}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default">Active</Badge>
                          <Button size="sm" variant="outline">Complete</Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="checkin" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Self-Service Check-In</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Check-in kiosk management and patient self-service options.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Queue Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Queue performance metrics and wait time analytics.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Queue, SCREEN_IDS.ADMIN_QUEUE_CHECKIN);