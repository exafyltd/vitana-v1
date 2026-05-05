import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import StandardHeader from "@/components/StandardHeader";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, Users, Bell, ChevronRight, AlertCircle, CheckCircle, Plus, Target, TrendingUp } from "lucide-react";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useEffect } from "react";
import { t } from '@/lib/i18n-toast';

export default function Calendar() {
  const navigate = useNavigate();
  const { logActivity } = useActivityLogger();

  // Log calendar view on mount
  useEffect(() => {
    logActivity({
      activityType: 'calendar.view',
      activityData: { page: 'overview' },
      dedupeKey: `calendar-view-${Date.now()}`,
    });
  }, []);

  const currentDate = new Date();
  const todayFormatted = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const todaysEvents = [
    { time: "9:00 AM", title: "Morning Yoga Session", type: "wellness", urgent: false },
    { time: "11:30 AM", title: "Doctor Appointment", type: "health", urgent: true },
    { time: "2:00 PM", title: "Nutrition Consultation", type: "wellness", urgent: false },
    { time: "5:30 PM", title: "Gym Workout", type: "fitness", urgent: false }
  ];

  const upcomingReminders = [
    { title: "Take evening supplements", due: "7:00 PM", priority: "high" },
    { title: "Meal prep for tomorrow", due: "8:00 PM", priority: "medium" },
    { title: "Review sleep goals", due: "9:30 PM", priority: "low" }
  ];

  const weeklyProgress = [
    { goal: "Workout Sessions", completed: 3, target: 5, percentage: 60 },
    { goal: "Hydration Goal", completed: 12, target: 14, percentage: 86 },
    { goal: "Sleep Quality", completed: 4, target: 7, percentage: 57 }
  ];

  return (
    <AppLayout>
      <SEO title={t('screens.calendar.calendarOverviewVitana')} description="Your comprehensive calendar and scheduling hub" canonical={window.location.href} />
      
      <StandardHeader
        title={t('screens.calendar.calendarOverview')}
        description="Your comprehensive calendar and scheduling hub with AI-powered insights and reminders."
        emoji="📅"
      />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('screens.calendar.todaySEvents')}</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todaysEvents.length}</div>
                <p className="text-xs text-muted-foreground">
                  {todaysEvents.filter(e => e.urgent).length} urgent
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('screens.calendar.pendingReminders')}</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingReminders.length}</div>
                <p className="text-xs text-muted-foreground">
                  {upcomingReminders.filter(r => r.priority === 'high').length} high priority
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('screens.calendar.weekCompletion')}</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">68%</div>
                <p className="text-xs text-muted-foreground">
                  {t('screens.calendar.averageAcrossAllGoals')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Today's Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t('screens.calendar.todaySSchedule')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{todayFormatted}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {todaysEvents.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-muted-foreground">{event.time}</div>
                      <div className="h-4 w-px bg-border" />
                      <div>
                        <div className="font-medium">{event.title}</div>
                        <div className="text-sm text-muted-foreground capitalize">{event.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.urgent && <AlertCircle className="h-4 w-4 text-red-500" />}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Active Reminders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {t('screens.calendar.activeReminders')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t('screens.calendar.upcomingNotifications')}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingReminders.map((reminder, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="font-medium">{reminder.title}</div>
                      <div className="text-sm text-muted-foreground">Due: {reminder.due}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        reminder.priority === 'high' ? 'bg-red-100 text-red-700' :
                        reminder.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {reminder.priority}
                      </span>
                      <CheckCircle className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-green-500" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Weekly Progress */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t('screens.calendar.weeklyProgress')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t('screens.calendar.yourGoalAchievementsThisWeek')}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {weeklyProgress.map((goal, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{goal.goal}</span>
                        <span className="text-muted-foreground">{goal.completed}/{goal.target}</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${goal.percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-muted-foreground">{goal.percentage}% complete</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Access */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>{t('screens.calendar.quickAccess')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('screens.calendar.jumpDifferentCalendarViews')}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col gap-2"
                  onClick={() => navigate('/calendar/month')}
                >
                  <CalendarIcon className="h-6 w-6" />
                  <span>{t('screens.calendar.month')}</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col gap-2"
                  onClick={() => navigate('/calendar/appointments')}
                >
                  <Users className="h-6 w-6" />
                  <span>{t('screens.calendar.appointments')}</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col gap-2"
                  onClick={() => navigate('/calendar/motivation')}
                >
                  <Target className="h-6 w-6" />
                  <span>{t('screens.calendar.motivation')}</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col gap-2"
                  onClick={() => navigate('/ai/insights')}
                >
                  <TrendingUp className="h-6 w-6" />
                  <span>{t('screens.calendar.aiInsights')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}