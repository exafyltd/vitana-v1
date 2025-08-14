import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, Users, Bell } from "lucide-react";

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

  const categoryCards = [
    {
      id: "month",
      title: "Month View",
      description: "Macro overview with goal alignment insights",
      icon: CalendarIcon,
      path: "/calendar/month",
      color: "from-blue-100 to-indigo-100"
    },
    {
      id: "week",
      title: "Week View",
      description: "Workload control with time slots",
      icon: Clock,
      path: "/calendar/week",
      color: "from-green-100 to-emerald-100"
    },
    {
      id: "day",
      title: "Day View", 
      description: "Focus mode for executing daily plans",
      icon: Users,
      path: "/calendar/day",
      color: "from-purple-100 to-violet-100"
    },
    {
      id: "appointments",
      title: "Appointment View",
      description: "Deep dive into meeting details",
      icon: CalendarIcon,
      path: "/calendar/appointments",
      color: "from-orange-100 to-amber-100"
    },
    {
      id: "reminders",
      title: "Reminder View",
      description: "Task anchor for goal alignment",
      icon: Bell,
      path: "/calendar/reminders",
      color: "from-pink-100 to-rose-100"
    },
    {
      id: "motivation",
      title: "Motivation & Inspiration",
      description: "Mindset boost with curated content",
      icon: Users,
      path: "/calendar/motivation",
      color: "from-yellow-100 to-amber-100"
    },
    {
      id: "progress",
      title: "Goal Progress",
      description: "Milestone tracker and alignment meter",
      icon: CalendarIcon,
      path: "/calendar/progress",
      color: "from-emerald-100 to-green-100"
    },
    {
      id: "recommendations",
      title: "Recommendations",
      description: "AI-curated events for growth & networking",
      icon: Bell,
      path: "/calendar/recommendations",
      color: "from-violet-100 to-purple-100"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Calendar" description="Manage your schedule, appointments, and events" canonical={window.location.href} />
      <SubNavigation items={calendarSubItems} />
      <div className="p-6 bg-gradient-to-br from-calendar-background via-calendar-primary-light/10 to-calendar-secondary/10 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-calendar-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-calendar-primary/20 mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Plan your perfect wellness day! 📅</h1>
            <p className="text-muted-foreground">Organize your wellness schedule, track important appointments, and never miss a wellness opportunity.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryCards.map((card) => (
              <Card 
                key={card.id}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 bg-calendar-card/90 backdrop-blur-sm border border-calendar-primary/10 hover:border-calendar-primary/30"
                onClick={() => navigate(card.path)}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-calendar-primary to-calendar-secondary flex items-center justify-center mb-4">
                    <card.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{card.title}</h3>
                  <p className="text-muted-foreground text-sm">{card.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}