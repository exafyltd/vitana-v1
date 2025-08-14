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
  Video
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

const timeSlots = [
  "09:00", "10:00", "11:00", "12:00", "13:00", 
  "14:00", "15:00", "16:00", "17:00", "18:00"
];

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const mockEvents = [
  {
    id: 1,
    title: "Morning Yoga",
    day: 1,
    startTime: "09:00",
    duration: 1,
    type: "fitness",
    attendees: [{ name: "Sarah", avatar: "" }],
    location: "Studio A"
  },
  {
    id: 2,
    title: "Project Meeting",
    day: 1,
    startTime: "14:00",
    duration: 2,
    type: "work",
    attendees: [{ name: "Team", avatar: "" }],
    location: "Conference Room"
  },
  {
    id: 3,
    title: "Nutrition Consult",
    day: 3,
    startTime: "10:00",
    duration: 1,
    type: "health",
    attendees: [{ name: "Dr. Smith", avatar: "" }],
    location: "Clinic"
  }
];

export default function Week() {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      const days = direction === 'prev' ? -7 : 7;
      newDate.setDate(prev.getDate() + days);
      return newDate;
    });
  };

  const getWeekDateRange = () => {
    const start = new Date(currentWeek);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return {
      start: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  };

  const { start, end } = getWeekDateRange();

  return (
    <AppLayout>
      <SEO title="Week View | Calendar" description="Manage exact time allocations for your weekly schedule" canonical={window.location.href} />
      <SubNavigation items={calendarSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-calendar-background via-calendar-primary/5 to-calendar-secondary/5 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-calendar-card/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-calendar-primary/20 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Week View - Workload Control ⏰
                </h1>
                <p className="text-muted-foreground">
                  Manage exact time allocations and drag-drop to reschedule
                </p>
              </div>
              <Button className="gap-2 bg-calendar-primary hover:bg-calendar-primary/90">
                <Plus className="w-4 h-4" />
                Add Event
              </Button>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <h2 className="text-xl font-semibold">
                {start} - {end}
              </h2>
              
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Week Grid */}
          <div className="bg-calendar-card/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-calendar-primary/20">
            <div className="grid grid-cols-8 gap-4">
              {/* Time Column */}
              <div className="space-y-4">
                <div className="h-12 flex items-center font-medium text-sm text-muted-foreground">
                  Time
                </div>
                {timeSlots.map((time) => (
                  <div key={time} className="h-16 flex items-start pt-2 text-sm text-muted-foreground">
                    {time}
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {weekDays.map((day, dayIndex) => (
                <div key={day} className="space-y-4">
                  {/* Day Header */}
                  <div className="h-12 flex flex-col items-center justify-center bg-calendar-primary/10 rounded-lg border border-calendar-primary/20">
                    <div className="font-medium text-sm">{day}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date().getDate() + dayIndex}
                    </div>
                  </div>
                  
                  {/* Time Slots */}
                  <div className="relative space-y-4">
                    {timeSlots.map((time, timeIndex) => (
                      <div 
                        key={time} 
                        className="h-16 border border-dashed border-calendar-primary/20 rounded-lg hover:bg-calendar-primary/5 transition-colors cursor-pointer"
                      >
                        {/* Render events for this day and time */}
                        {mockEvents
                          .filter(event => event.day === dayIndex && event.startTime === time)
                          .map(event => (
                            <Card 
                              key={event.id}
                              className="h-full bg-gradient-to-r from-calendar-primary to-calendar-secondary text-white border-0 cursor-move hover:shadow-lg transition-all"
                            >
                              <CardContent className="p-2 h-full flex flex-col justify-between">
                                <div>
                                  <h4 className="text-xs font-medium truncate">{event.title}</h4>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Clock className="w-3 h-3" />
                                    <span className="text-xs">{event.startTime}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  <span className="text-xs truncate">{event.location}</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        }
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Suggestions */}
          <Card className="mt-6 bg-calendar-card/90 backdrop-blur-sm border border-calendar-primary/20">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-calendar-accent"></div>
                AI Scheduling Suggestions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-calendar-success/10 border border-calendar-success/20 rounded-lg">
                  <p className="text-sm">
                    <strong>Optimization:</strong> Consider moving your 3 PM meeting to Tuesday 2 PM for better energy alignment.
                  </p>
                </div>
                <div className="p-4 bg-calendar-accent/10 border border-calendar-accent/20 rounded-lg">
                  <p className="text-sm">
                    <strong>Suggestion:</strong> Schedule a 15-minute break between your morning sessions for optimal performance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}