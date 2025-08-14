import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, Users, Bell } from "lucide-react";

const calendarSubItems = [
  { id: "overview", name: "Overview", path: "/calendar" },
  { id: "week", name: "Week View", path: "/calendar/week" },
  { id: "day", name: "Day View", path: "/calendar/day" },
  { id: "appointments", name: "Appointments", path: "/calendar/appointments" },
  { id: "events", name: "Events", path: "/calendar/events" },
  { id: "reminders", name: "Reminders", path: "/calendar/reminders" },
];

export default function Calendar() {
  const navigate = useNavigate();

  const categoryCards = [
    {
      id: "week",
      title: "Week View",
      description: "See your weekly schedule at a glance",
      icon: CalendarIcon,
      path: "/calendar/week",
      color: "from-blue-100 to-indigo-100"
    },
    {
      id: "day",
      title: "Day View", 
      description: "Focus on today's agenda",
      icon: Clock,
      path: "/calendar/day",
      color: "from-green-100 to-emerald-100"
    },
    {
      id: "appointments",
      title: "Appointments",
      description: "Manage your wellness appointments",
      icon: Users,
      path: "/calendar/appointments",
      color: "from-purple-100 to-violet-100"
    },
    {
      id: "events",
      title: "Events",
      description: "Track wellness events and activities",
      icon: CalendarIcon,
      path: "/calendar/events",
      color: "from-orange-100 to-amber-100"
    },
    {
      id: "reminders",
      title: "Reminders",
      description: "Never miss important wellness tasks",
      icon: Bell,
      path: "/calendar/reminders",
      color: "from-pink-100 to-rose-100"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Calendar" description="Manage your schedule, appointments, and events" canonical={window.location.href} />
      <SubNavigation items={calendarSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Plan your perfect wellness day! 📅</h1>
            <p className="text-muted-foreground">Organize your wellness schedule, track important appointments, and never miss a wellness opportunity.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryCards.map((card) => (
              <Card 
                key={card.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm border border-white/20"
                onClick={() => navigate(card.path)}
              >
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}>
                    <card.icon className="w-6 h-6 text-gray-700" />
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