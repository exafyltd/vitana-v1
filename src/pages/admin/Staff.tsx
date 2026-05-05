import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, Clock, UserPlus, Settings } from "lucide-react";
import { adminUserManagementNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { t } from '@/lib/i18n-toast';

const mockStaff = [
  { id: "1", name: "Dr. Sarah Wilson", role: "Physician", department: "Internal Medicine", status: "active", shift: "Morning" },
  { id: "2", name: "Mike Thompson", role: "Nurse", department: "Emergency", status: "active", shift: "Night" },
  { id: "3", name: "Lisa Chen", role: "Therapist", department: "Physical Therapy", status: "scheduled", shift: "Afternoon" }
];

function Staff() {
  return (
    <AppLayout>
      <SEO title={t('screens.admin.staffDirectoryAdmin')} description="Manage staff directory and scheduling" canonical={window.location.href} />
      <SubNavigation items={adminUserManagementNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.staffDirectoryScheduling')}
            description="Manage team members, schedules, and workforce planning"
            emoji="👥"
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">47</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.totalStaff')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">32</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.duty')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">156</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.scheduledHours')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">3</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.newHires')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="directory" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="directory">{t('screens.admin.staffDirectory')}</TabsTrigger>
              <TabsTrigger value="scheduling">{t('screens.admin.scheduling')}</TabsTrigger>
              <TabsTrigger value="availability">{t('screens.admin.availability')}</TabsTrigger>
              <TabsTrigger value="reports">{t('screens.admin.reports')}</TabsTrigger>
            </TabsList>

            <TabsContent value="directory" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{t('screens.admin.activeStaffMembers')}</h3>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t('screens.admin.addStaff')}
                </Button>
              </div>

              <div className="grid gap-4">
                {mockStaff.map((staff) => (
                  <Card key={staff.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-600">
                              {staff.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{staff.name}</p>
                            <p className="text-sm text-muted-foreground">{staff.role} • {staff.department}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={staff.status === 'active' ? 'default' : 'secondary'}>
                            {staff.shift}
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="scheduling" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.scheduleManagement')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('screens.admin.shiftSchedulingWorkforcePlanningTools')}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="availability" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.staffAvailability')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('screens.admin.realtimeAvailabilityTrackingTimeoffManagement')}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.workforceReports')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('screens.admin.staffingAnalyticsPerformanceMetrics')}</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Staff, SCREEN_IDS.ADMIN_STAFF_DIRECTORY);