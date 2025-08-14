import { useState } from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock,
  MapPin,
  Users,
  Video,
  Phone,
  Calendar,
  Sun
} from "lucide-react";

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

const mockDayEvents = [
  {
    id: 1,
    title: "Morning Yoga Session",
    time: "09:00 - 10:00",
    type: "fitness",
    status: "confirmed",
    location: "Studio A - Building 2",
    attendees: [{ name: "Sarah Chen", avatar: "", role: "Instructor" }]
  },
  {
    id: 2,
    title: "Team Wellness Check-in",
    time: "11:30 - 12:00",
    type: "work",
    status: "pending",
    location: "Video Call",
    attendees: [{ name: "Emma Davis", avatar: "", role: "Team Lead" }]
  }
];

export default function Day() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === 'prev' ? -1 : 1));
      return newDate;
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <AppLayout>
      <SEO title="Day View | Calendar" description="Focus mode for executing daily plans" canonical={window.location.href} />
      <SubNavigation items={calendarSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-calendar-background via-calendar-primary/5 to-calendar-secondary/5 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-calendar-card/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-calendar-primary/20 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Day View - Focus Mode 🎯</h1>
                <p className="text-muted-foreground">Execute your daily plan with AI-powered preparation tips</p>
              </div>
              <Button className="gap-2 bg-calendar-primary hover:bg-calendar-primary/90">
                <Plus className="w-4 h-4" />
                Quick Add
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => navigateDay('prev')}>
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <h2 className="text-xl font-semibold">{formatDate(currentDate)}</h2>
              <Button variant="outline" size="sm" onClick={() => navigateDay('next')}>
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {mockDayEvents.map((event) => (
              <Card key={event.id} className="bg-calendar-card/90 backdrop-blur-sm border border-calendar-primary/20 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-3 h-3 rounded-full mt-2 bg-calendar-primary"></div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">{event.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {event.time}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-calendar-primary text-white">
                      {event.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}