import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, Users, Bell, ChevronRight, AlertCircle, CheckCircle, Plus, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calendarNavigation } from "@/config/navigation";
import StandardHeader from "@/components/StandardHeader";

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
      <SubNavigation items={calendarNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="Calendar Overview"
            description="Your wellness schedule overview and progress tracking."
            emoji="📅"
          />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card/80 backdrop-blur-sm rounded-lg p-4 border border-white/20 shadow-sm">
            <div className="text-2xl font-bold text-foreground">{todaysEvents.length}</div>
            <div className="text-sm text-muted-foreground">Today's Events</div>
          </div>
          <div className="bg-card/80 backdrop-blur-sm rounded-lg p-4 border border-white/20 shadow-sm">
            <div className="text-2xl font-bold text-foreground">{upcomingReminders.length}</div>
            <div className="text-sm text-muted-foreground">Pending Reminders</div>
          </div>
          <div className="bg-card/80 backdrop-blur-sm rounded-lg p-4 border border-white/20 shadow-sm">
            <div className="text-2xl font-bold text-foreground">73%</div>
            <div className="text-sm text-muted-foreground">Week Completion</div>
          </div>
          <div className="bg-card/80 backdrop-blur-sm rounded-lg p-4 border border-white/20 shadow-sm">
            <div className="text-2xl font-bold text-foreground">12</div>
            <div className="text-sm text-muted-foreground">This Week</div>
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
      </div>
    </AppLayout>
  );
}