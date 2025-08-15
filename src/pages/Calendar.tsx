import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, Users, Bell, ChevronRight, AlertCircle, CheckCircle, Plus, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const calendarSubItems = [
  { id: "overview", name: "Overview", path: "/calendar" },
  { id: "month", name: "Month View", path: "/calendar/month" },
  { id: "week", name: "Week View", path: "/calendar/week" },
  { id: "day", name: "Day View", path: "/calendar/day" },
  { id: "appointments", name: "Appointments", path: "/calendar/appointments" },
  { id: "reminders", name: "Reminders", path: "/calendar/reminders" },
  { id: "motivation", name: "Motivation", path: "/calendar/motivation" },
  { id: "progress", name: "Goal Progress", path: "/calendar/progress" },
  { id: "recommendations", name: "Recommendations", path: "/calendar/recommendations" },
];

export default function Calendar() {
  const navigate = useNavigate();

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
      <SEO title="Calendar Overview" description="Your wellness schedule overview" canonical={window.location.href} />
      <SubNavigation items={calendarSubItems} />
      <div className="p-6 space-y-6">
        {/* Header Summary */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Let's set you up for success today, Jovana! 📅
          </h1>
          <p className="text-muted-foreground">Your wellness schedule and progress overview for {todayFormatted}</p>
        </div>
        
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <Button onClick={() => navigate('/calendar/day')} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
              <Button onClick={() => navigate('/calendar/reminders')} variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-2" />
                Reminders
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{todaysEvents.length}</div>
              <div className="text-sm text-muted-foreground">Today's Events</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{upcomingReminders.length}</div>
              <div className="text-sm text-muted-foreground">Pending Reminders</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">73%</div>
              <div className="text-sm text-muted-foreground">Week Completion</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">12</div>
              <div className="text-sm text-muted-foreground">This Week</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Schedule */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Today's Schedule
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/calendar/day')}>
                View Day <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {todaysEvents.map((event, index) => (
                <div key={index} className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                  event.urgent ? 'border-l-destructive bg-destructive/5' : 'border-l-primary bg-muted/50'
                }`}>
                  <div className="flex items-center gap-3">
                    {event.urgent ? 
                      <AlertCircle className="w-4 h-4 text-destructive" /> : 
                      <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    }
                    <div>
                      <div className="font-medium text-foreground">{event.title}</div>
                      <div className="text-sm text-muted-foreground">{event.time}</div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs ${
                    event.type === 'health' ? 'bg-destructive/10 text-destructive' :
                    event.type === 'wellness' ? 'bg-primary/10 text-primary' :
                    'bg-secondary/10 text-secondary-foreground'
                  }`}>
                    {event.type}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming Reminders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Active Reminders
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/calendar/reminders')}>
                All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingReminders.map((reminder, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="font-medium text-foreground text-sm">{reminder.title}</div>
                    <div className="text-xs text-muted-foreground">{reminder.due}</div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    reminder.priority === 'high' ? 'bg-destructive' :
                    reminder.priority === 'medium' ? 'bg-primary' : 'bg-muted-foreground'
                  }`} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Weekly Progress & Quick Access */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Goals Progress */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Weekly Progress
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/calendar/progress')}>
                Details <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {weeklyProgress.map((goal, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{goal.goal}</span>
                    <span className="text-sm text-muted-foreground">{goal.completed}/{goal.target}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${goal.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Access */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Quick Access
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/calendar/month')}
              >
                <CalendarIcon className="w-6 h-6" />
                <span className="text-sm">Month View</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/calendar/appointments')}
              >
                <Users className="w-6 h-6" />
                <span className="text-sm">Appointments</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/calendar/motivation')}
              >
                <Target className="w-6 h-6" />
                <span className="text-sm">Motivation</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/calendar/recommendations')}
              >
                <TrendingUp className="w-6 h-6" />
                <span className="text-sm">AI Insights</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}