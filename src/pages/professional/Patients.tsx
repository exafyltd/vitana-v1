import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Search, Plus, Calendar } from "lucide-react";
import { t } from '@/lib/i18n-toast';

export default function ProfessionalPatients() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t('screens.professional.myPatients')}</h1>
          <p className="text-muted-foreground">
            {t('screens.professional.manageYourPatientRosterCarePlans')}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('screens.professional.addPatient')}
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('screens.professional.searchPatients')} className="pl-10" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarFallback>{t('screens.professional.jd')}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{t('screens.professional.johnDoe')}</CardTitle>
                <CardDescription>{t('screens.professional.age45Male')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('screens.professional.lastVisit')}</span>
                <span className="text-sm">{t('screens.professional.text2WeeksAgo')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('screens.professional.nextAppointment')}</span>
                <Badge variant="outline">{t('screens.professional.tomorrow900Am')}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('screens.professional.condition')}</span>
                <Badge variant="secondary">{t('screens.professional.hypertension')}</Badge>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1">{t('screens.professional.viewChart')}</Button>
                <Button size="sm" variant="outline">
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarFallback>{t('screens.professional.sj')}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{t('screens.professional.sarahJohnson')}</CardTitle>
                <CardDescription>{t('screens.professional.age32Female')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('screens.professional.lastVisit')}</span>
                <span className="text-sm">{t('screens.professional.text1WeekAgo')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('screens.professional.nextAppointment')}</span>
                <Badge variant="outline">{t('screens.professional.friday230Pm')}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('screens.professional.condition')}</span>
                <Badge variant="secondary">{t('screens.professional.followup')}</Badge>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1">{t('screens.professional.viewChart')}</Button>
                <Button size="sm" variant="outline">
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarFallback>{t('screens.professional.mw')}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{t('screens.professional.mikeWilson')}</CardTitle>
                <CardDescription>{t('screens.professional.age28Male')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('screens.professional.lastVisit')}</span>
                <span className="text-sm">{t('screens.professional.text3DaysAgo')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('screens.professional.nextAppointment')}</span>
                <Badge variant="outline">{t('screens.professional.nextWeek')}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('screens.professional.condition')}</span>
                <Badge variant="secondary">{t('screens.professional.labReview')}</Badge>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1">{t('screens.professional.viewChart')}</Button>
                <Button size="sm" variant="outline">
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}