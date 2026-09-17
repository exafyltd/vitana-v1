import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, User, AlertCircle, CheckCircle } from "lucide-react";
import { t } from '@/lib/i18n-toast';
import AppLayout from "@/components/AppLayout";

// VTID-04001: on a phone each queue card used to force three metadata spans
// and two buttons into one non-wrapping row, so the row overflowed the card
// (reported from staging). Metadata now wraps and the actions drop under it
// below `sm`; the desktop layout is unchanged. The queue content itself is
// still the demo data this screen has always shown — there is no backing
// table for a staff patient queue.
export default function StaffQueue() {
  return (
    <AppLayout>
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('screens.staff.patientQueue')}</h1>
        <p className="text-muted-foreground">
          {t('screens.staff.managePatientCheckinsWaitingList')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.staff.waiting')}</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              {t('screens.staff.patientsQueue')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.staff.progress')}</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              {t('screens.staff.seen')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.staff.urgent')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              {t('screens.staff.priorityCases')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.staff.completed')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              {t('screens.staff.todaySTotal')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t('screens.staff.currentQueue')}</h2>
        
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar>
                  <AvatarFallback className="bg-red-100 text-red-800">{t('screens.staff.jd')}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="truncate text-lg">{t('screens.staff.johnDoe')}</CardTitle>
                  <CardDescription>{t('screens.staff.walkinChestPain')}</CardDescription>
                </div>
              </div>
              <Badge variant="destructive">{t('screens.staff.urgent2')}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{t('screens.staff.arrived1015Am')}</span>
                <span>{t('screens.staff.waitTime45Min')}</span>
                <span>{t('screens.staff.roomTriage')}</span>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" className="flex-1 sm:flex-none">{t('screens.staff.callPatient')}</Button>
                <Button size="sm" variant="outline" className="flex-1 sm:flex-none">{t('screens.staff.assignRoom')}</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar>
                  <AvatarFallback className="bg-orange-100 text-orange-800">{t('screens.staff.sj')}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="truncate text-lg">{t('screens.staff.sarahJohnson')}</CardTitle>
                  <CardDescription>{t('screens.staff.appointmentFollowup')}</CardDescription>
                </div>
              </div>
              <Badge variant="outline">{t('screens.staff.waiting2')}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{t('screens.staff.arrived1030Am')}</span>
                <span>{t('screens.staff.waitTime30Min')}</span>
                <span>{t('screens.staff.roomWaitingArea')}</span>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" className="flex-1 sm:flex-none">{t('screens.staff.callPatient')}</Button>
                <Button size="sm" variant="outline" className="flex-1 sm:flex-none">{t('screens.staff.assignRoom')}</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar>
                  <AvatarFallback className="bg-blue-100 text-blue-800">{t('screens.staff.mw')}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="truncate text-lg">{t('screens.staff.mikeWilson')}</CardTitle>
                  <CardDescription>{t('screens.staff.appointmentLabResults')}</CardDescription>
                </div>
              </div>
              <Badge variant="secondary">{t('screens.staff.progress2')}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{t('screens.staff.started1045Am')}</span>
                <span>{t('screens.staff.duration15Min')}</span>
                <span>{t('screens.staff.room205DrMiller')}</span>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" className="flex-1 sm:flex-none">{t('screens.staff.viewProgress')}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </AppLayout>
  );
}