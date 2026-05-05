import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Activity, TrendingUp, Calendar } from "lucide-react";
import { t } from '@/lib/i18n-toast';

export default function PatientHealth() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('screens.patient.myHealth')}</h1>
        <p className="text-muted-foreground">
          {t('screens.patient.trackManageYourHealthMetricsWellness')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              {t('screens.patient.vitalSigns')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t('screens.patient.bloodPressure')}</span>
                <Badge variant="outline">120/80</Badge>
              </div>
              <div className="flex justify-between">
                <span>{t('screens.patient.heartRate')}</span>
                <Badge variant="outline">{t('screens.patient.text72Bpm')}</Badge>
              </div>
              <div className="flex justify-between">
                <span>{t('screens.patient.weight')}</span>
                <Badge variant="outline">{t('screens.patient.text165Lbs')}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              {t('screens.patient.activity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t('screens.patient.stepsToday')}</span>
                <Badge variant="outline">8,247</Badge>
              </div>
              <div className="flex justify-between">
                <span>{t('screens.patient.activeMinutes')}</span>
                <Badge variant="outline">{t('screens.patient.text45Min')}</Badge>
              </div>
              <div className="flex justify-between">
                <span>{t('screens.patient.caloriesBurned')}</span>
                <Badge variant="outline">342</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              {t('screens.patient.progress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t('screens.patient.weeklyGoals')}</span>
                <Badge variant="outline">7/10</Badge>
              </div>
              <div className="flex justify-between">
                <span>{t('screens.patient.healthScore')}</span>
                <Badge variant="outline">85/100</Badge>
              </div>
              <div className="flex justify-between">
                <span>{t('screens.patient.trend')}</span>
                <Badge variant="default">{t('screens.patient.improving')}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('screens.patient.healthTimeline')}</CardTitle>
          <CardDescription>{t('screens.patient.recentHealthEventsMilestones')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t('screens.patient.bloodPressureRecorded')}</p>
                <p className="text-xs text-muted-foreground">{t('screens.patient.todayAt830Am')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t('screens.patient.completedWorkout')}</p>
                <p className="text-xs text-muted-foreground">{t('screens.patient.yesterday45MinCardioSession')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t('screens.patient.medicationTaken')}</p>
                <p className="text-xs text-muted-foreground">{t('screens.patient.text2DaysAgoDailyVitamins')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}