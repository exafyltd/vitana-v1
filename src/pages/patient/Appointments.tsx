import { Panel, PanelContent, PanelDescription, PanelHeader, PanelTitle } from '@/components/layout/spotlight/Panel';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Plus } from "lucide-react";
import { t } from '@/lib/i18n-toast';
import AppLayout from "@/components/AppLayout";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { PatientComingSoonBody } from "@/components/spotlight/member/PatientSpotlight";

export default function PatientAppointments() {
  // VTID-05117 — Spotlight (desktop + flag): every value on the legacy screen is a sample, so the
  // collection frame shows the honest "not available yet" state (SR-24). Phones and flag-off keep the screen below.
  const spotlight = useSpotlightEnabled();
  if (spotlight) {
    return (
      <AppLayout>
        <ScreenFrame archetype="collection" header={{ title: t('screens.patient.myAppointments'), description: t('screens.patient.manageYourUpcomingPastAppointments') }}>
          <PatientComingSoonBody Icon={Calendar} />
        </ScreenFrame>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t('screens.patient.myAppointments')}</h1>
          <p className="text-muted-foreground">
            {t('screens.patient.manageYourUpcomingPastAppointments')}
          </p>
        </div>
        <Button>
          <Plus className="me-2 h-4 w-4" />
          {t('screens.patient.scheduleNew')}
        </Button>
      </div>

      <div className="space-y-4">
        <Panel>
          <PanelHeader>
            <div className="flex justify-between items-start">
              <div>
                <PanelTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t('screens.patient.drSarahMillerAnnualCheckup')}
                </PanelTitle>
                <PanelDescription>{t('screens.patient.generalMedicine')}</PanelDescription>
              </div>
              <Badge>{t('screens.patient.upcoming')}</Badge>
            </div>
          </PanelHeader>
          <PanelContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('screens.patient.tomorrow200Pm2')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('screens.patient.medicalCenterRoom205')}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">{t('screens.patient.reschedule')}</Button>
                <Button size="sm" variant="outline">{t('screens.patient.cancel')}</Button>
              </div>
            </div>
          </PanelContent>
        </Panel>

        <Panel>
          <PanelHeader>
            <div className="flex justify-between items-start">
              <div>
                <PanelTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t('screens.patient.drJamesDavisFollowup')}
                </PanelTitle>
                <PanelDescription>{t('screens.patient.cardiology')}</PanelDescription>
              </div>
              <Badge>{t('screens.patient.upcoming')}</Badge>
            </div>
          </PanelHeader>
          <PanelContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('screens.patient.nextWeekFriday1000Am')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('screens.patient.cardiologyWingRoom301')}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">{t('screens.patient.reschedule')}</Button>
                <Button size="sm" variant="outline">{t('screens.patient.cancel')}</Button>
              </div>
            </div>
          </PanelContent>
        </Panel>

        <Panel>
          <PanelHeader>
            <div className="flex justify-between items-start">
              <div>
                <PanelTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t('screens.patient.drLisaChenConsultation')}
                </PanelTitle>
                <PanelDescription>{t('screens.patient.dermatology')}</PanelDescription>
              </div>
              <Badge variant="secondary">{t('screens.patient.completed')}</Badge>
            </div>
          </PanelHeader>
          <PanelContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('screens.patient.lastWeekMonday300Pm')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('screens.patient.dermatologyClinic')}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">{t('screens.patient.viewNotes')}</Button>
                <Button size="sm" variant="outline">{t('screens.patient.bookFollowup')}</Button>
              </div>
            </div>
          </PanelContent>
        </Panel>
      </div>
    </div>
    </AppLayout>
  );
}