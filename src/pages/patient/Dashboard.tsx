import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Calendar, TestTube, Target, Loader2, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import { t } from '@/lib/i18n-toast';
import { formatDate } from '@/lib/locale-format';
import AppLayout from "@/components/AppLayout";
import { usePatientHealthResults } from '@/hooks/usePatientHealthResults';

function RecentResultsCard() {
  const { data: results, isLoading } = usePatientHealthResults();
  const recent = (results ?? []).slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('screens.patient.results.recentResultsTitle')}</CardTitle>
        <CardDescription>{t('screens.patient.results.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('screens.patient.results.empty')}</p>
        ) : (
          recent.map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">{t('screens.patient.results.markerCount', { count: r.biomarkers.length })}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(new Date(r.report_date ?? r.created_at), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
          ))
        )}
        <Button asChild variant="outline" className="w-full justify-start">
          <Link to="/patient/results">
            <TestTube className="mr-2 h-4 w-4" />
            {t('screens.patient.results.viewAll')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PatientDashboard() {
  return (
    <AppLayout>
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('screens.patient.patientDashboard')}</h1>
        <p className="text-muted-foreground">
          {t('screens.patient.yourPersonalizedHealthManagementCenter')}
        </p>
      </div>

      <RecentResultsCard />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.patient.nextAppointment')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t('screens.patient.tomorrow')}</div>
            <p className="text-xs text-muted-foreground">
              {t('screens.patient.drSmithAt200Pm')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.patient.healthScore')}</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85/100</div>
            <p className="text-xs text-muted-foreground">{t('screens.patient.text5FromLastMonth')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.patient.pendingResults')}</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              {t('screens.patient.bloodWorkXray')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.patient.goalsProgress')}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7/10</div>
            <p className="text-xs text-muted-foreground">
              {t('screens.patient.weeklyGoalsCompleted')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('screens.patient.recentActivity')}</CardTitle>
            <CardDescription>{t('screens.patient.yourLatestHealthActivities')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t('screens.patient.completedDailyWalk')}</p>
                <p className="text-xs text-muted-foreground">{t('screens.patient.text2HoursAgo')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t('screens.patient.bloodPressureRecorded')}</p>
                <p className="text-xs text-muted-foreground">{t('screens.patient.yesterday')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t('screens.patient.medicationReminder')}</p>
                <p className="text-xs text-muted-foreground">{t('screens.patient.text3DaysAgo')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('screens.patient.quickActions')}</CardTitle>
            <CardDescription>{t('screens.patient.commonTasksShortcuts')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              {t('screens.patient.scheduleAppointment')}
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TestTube className="mr-2 h-4 w-4" />
              {t('screens.patient.viewTestResults')}
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Heart className="mr-2 h-4 w-4" />
              {t('screens.patient.logHealthData')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
    </AppLayout>
  );
}