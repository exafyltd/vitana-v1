import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, Users, Activity } from "lucide-react";
import { t } from '@/lib/i18n-toast';

export default function StaffDashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('screens.staff.staffDashboard')}</h1>
        <p className="text-muted-foreground">
          {t('screens.staff.yourDailyWorkflowTaskManagementCenter')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.staff.patientQueue')}</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              {t('screens.staff.patientsWaiting')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.staff.hoursToday')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6.5h</div>
            <p className="text-xs text-muted-foreground">
              {t('screens.staff.text15hRemaining')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.staff.tasksCompleted')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12/18</div>
            <p className="text-xs text-muted-foreground">
              {t('screens.staff.text6TasksRemaining')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.staff.teamCoverage')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4/5</div>
            <p className="text-xs text-muted-foreground">
              {t('screens.staff.staffDuty')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('screens.staff.pendingTasks')}</CardTitle>
            <CardDescription>{t('screens.staff.yourAssignedTasksForToday')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('screens.staff.patientCheckinAssistance')}</p>
                <p className="text-xs text-muted-foreground">{t('screens.staff.room3MrJohnson')}</p>
              </div>
              <Badge variant="destructive">{t('screens.staff.urgent')}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('screens.staff.equipmentSanitization')}</p>
                <p className="text-xs text-muted-foreground">{t('screens.staff.examRooms14')}</p>
              </div>
              <Badge variant="outline">{t('screens.staff.normal')}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('screens.staff.insuranceVerification')}</p>
                <p className="text-xs text-muted-foreground">{t('screens.staff.text3PendingCases')}</p>
              </div>
              <Badge variant="outline">{t('screens.staff.normal')}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('screens.staff.quickActions')}</CardTitle>
            <CardDescription>{t('screens.staff.commonStaffFunctions')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <ClipboardList className="mr-2 h-4 w-4" />
              {t('screens.staff.viewPatientQueue')}
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              {t('screens.staff.clockInout')}
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Activity className="mr-2 h-4 w-4" />
              {t('screens.staff.dailyTasks')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}