import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Activity, DollarSign } from "lucide-react";
import { t } from '@/lib/i18n-toast';

export default function ProfessionalDashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('screens.professional.professionalDashboard')}</h1>
        <p className="text-muted-foreground">
          Your healthcare practice management center
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.professional.todaySPatients')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              3 pending appointments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.professional.nextAppointment')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t('screens.professional.text230Pm')}</div>
            <p className="text-xs text-muted-foreground">
              Sarah Johnson - Follow-up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.professional.patientReviews')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              Pending clinical reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('screens.professional.monthlyRevenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$24,500</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('screens.professional.todaySSchedule')}</CardTitle>
            <CardDescription>{t('screens.professional.yourAppointmentsForToday')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('screens.professional.johnDoe')}</p>
                <p className="text-xs text-muted-foreground">{t('screens.professional.annualCheckup')}</p>
              </div>
              <Badge variant="outline">{t('screens.professional.text900Am')}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('screens.professional.sarahJohnson')}</p>
                <p className="text-xs text-muted-foreground">{t('screens.professional.followup')}</p>
              </div>
              <Badge variant="outline">{t('screens.professional.text230Pm')}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('screens.professional.mikeWilson')}</p>
                <p className="text-xs text-muted-foreground">{t('screens.professional.labResultsReview')}</p>
              </div>
              <Badge variant="outline">{t('screens.professional.text400Pm')}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('screens.professional.quickActions')}</CardTitle>
            <CardDescription>{t('screens.professional.commonProfessionalTasks')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              View Patient List
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Manage Schedule
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Activity className="mr-2 h-4 w-4" />
              Clinical Tools
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}