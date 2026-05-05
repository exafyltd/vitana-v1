import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Plus } from "lucide-react";
import { t } from '@/lib/i18n-toast';

export default function PatientAppointments() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t('screens.patient.myAppointments')}</h1>
          <p className="text-muted-foreground">
            {t('screens.patient.manageYourUpcomingPastAppointments')}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('screens.patient.scheduleNew')}
        </Button>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t('screens.patient.drSarahMillerAnnualCheckup')}
                </CardTitle>
                <CardDescription>{t('screens.patient.generalMedicine')}</CardDescription>
              </div>
              <Badge>{t('screens.patient.upcoming')}</Badge>
            </div>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t('screens.patient.drJamesDavisFollowup')}
                </CardTitle>
                <CardDescription>{t('screens.patient.cardiology')}</CardDescription>
              </div>
              <Badge>{t('screens.patient.upcoming')}</Badge>
            </div>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t('screens.patient.drLisaChenConsultation')}
                </CardTitle>
                <CardDescription>{t('screens.patient.dermatology')}</CardDescription>
              </div>
              <Badge variant="secondary">{t('screens.patient.completed')}</Badge>
            </div>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}