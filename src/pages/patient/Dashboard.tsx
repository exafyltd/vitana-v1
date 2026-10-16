import { Panel, PanelContent, PanelDescription, PanelHeader, PanelTitle } from "@/components/layout/spotlight/Panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Calendar, TestTube, Target, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import { t } from '@/lib/i18n-toast';
import { formatDate } from '@/lib/locale-format';
import AppLayout from "@/components/AppLayout";
import { usePatientHealthResults } from '@/hooks/usePatientHealthResults';
import { ScreenFrame, SpotlightLoading } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { RecentResultsRows } from "@/components/spotlight/member/PatientSpotlight";
import { SpotlightPanel } from "@/components/spotlight/member/MemberSpotlight";

function RecentResultsCard() {
  const { data: results, isLoading } = usePatientHealthResults();
  const recent = (results ?? []).slice(0, 3);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t('screens.patient.results.recentResultsTitle')}</PanelTitle>
        <PanelDescription>{t('screens.patient.results.subtitle')}</PanelDescription>
      </PanelHeader>
      <PanelContent className="space-y-3">
        {isLoading ? (
          <SpotlightLoading rows={3} />
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
            <TestTube className="me-2 h-4 w-4" />
            {t('screens.patient.results.viewAll')}
          </Link>
        </Button>
      </PanelContent>
    </Panel>
  );
}

export default function PatientDashboard() {
  // VTID-05117 — Spotlight (desktop + flag): only the member's real recent results; the sample KPIs,
  // activity and dead quick actions stay on the legacy screen (SR-24, SR-26).
  const spotlight = useSpotlightEnabled();
  if (spotlight) {
    return (
      <AppLayout>
        <ScreenFrame
          archetype="collection"
          header={{ title: t('screens.patient.patientDashboard'), description: t('screens.patient.yourPersonalizedHealthManagementCenter') }}
        >
          <SpotlightPanel Icon={FlaskConical} title={t('screens.patient.results.recentResultsTitle')} description={t('screens.patient.results.subtitle')}>
            <RecentResultsRows />
          </SpotlightPanel>
        </ScreenFrame>
      </AppLayout>
    );
  }
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
        <Panel>
          <PanelHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <PanelTitle className="text-sm font-medium">{t('screens.patient.nextAppointment')}</PanelTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </PanelHeader>
          <PanelContent>
            <div className="text-2xl font-bold">{t('screens.patient.tomorrow')}</div>
            <p className="text-xs text-muted-foreground">
              {t('screens.patient.drSmithAt200Pm')}
            </p>
          </PanelContent>
        </Panel>

        <Panel>
          <PanelHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <PanelTitle className="text-sm font-medium">{t('screens.patient.healthScore')}</PanelTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </PanelHeader>
          <PanelContent>
            <div className="text-2xl font-bold">85/100</div>
            <p className="text-xs text-muted-foreground">{t('screens.patient.text5FromLastMonth')}
            </p>
          </PanelContent>
        </Panel>

        <Panel>
          <PanelHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <PanelTitle className="text-sm font-medium">{t('screens.patient.pendingResults')}</PanelTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </PanelHeader>
          <PanelContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              {t('screens.patient.bloodWorkXray')}
            </p>
          </PanelContent>
        </Panel>

        <Panel>
          <PanelHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <PanelTitle className="text-sm font-medium">{t('screens.patient.goalsProgress')}</PanelTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </PanelHeader>
          <PanelContent>
            <div className="text-2xl font-bold">7/10</div>
            <p className="text-xs text-muted-foreground">
              {t('screens.patient.weeklyGoalsCompleted')}
            </p>
          </PanelContent>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel>
          <PanelHeader>
            <PanelTitle>{t('screens.patient.recentActivity')}</PanelTitle>
            <PanelDescription>{t('screens.patient.yourLatestHealthActivities')}</PanelDescription>
          </PanelHeader>
          <PanelContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-status-success rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t('screens.patient.completedDailyWalk')}</p>
                <p className="text-xs text-muted-foreground">{t('screens.patient.text2HoursAgo')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-status-info rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t('screens.patient.bloodPressureRecorded')}</p>
                <p className="text-xs text-muted-foreground">{t('screens.patient.yesterday')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-status-warning rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t('screens.patient.medicationReminder')}</p>
                <p className="text-xs text-muted-foreground">{t('screens.patient.text3DaysAgo')}</p>
              </div>
            </div>
          </PanelContent>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>{t('screens.patient.quickActions')}</PanelTitle>
            <PanelDescription>{t('screens.patient.commonTasksShortcuts')}</PanelDescription>
          </PanelHeader>
          <PanelContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="me-2 h-4 w-4" />
              {t('screens.patient.scheduleAppointment')}
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TestTube className="me-2 h-4 w-4" />
              {t('screens.patient.viewTestResults')}
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Heart className="me-2 h-4 w-4" />
              {t('screens.patient.logHealthData')}
            </Button>
          </PanelContent>
        </Panel>
      </div>
    </div>
    </AppLayout>
  );
}