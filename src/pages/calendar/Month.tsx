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
  Bell,
  MapPin,
  Clock,
  Users
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

const mockEvents = [
  {
    id: 1,
    title: "Yoga Session",
    time: "09:00",
    attendees: [{ name: "Sarah", avatar: "" }, { name: "Mike", avatar: "" }],
    type: "fitness",
    status: "confirmed"
  },
  {
    id: 2,
    title: "Nutrition Consult",
    time: "14:30",
    attendees: [{ name: "Dr. Smith", avatar: "" }],
    type: "health",
    status: "pending"
  },
  {
    id: 3,
    title: "Team Wellness Check",
    time: "16:00",
    attendees: [{ name: "Team", avatar: "" }],
    type: "work",
    status: "confirmed"
  }
];

export default function Month() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getEventCountForDay = (day: number) => {
    // Mock logic - in real app, filter events by date
    return Math.floor(Math.random() * 4);
  };

  const getDayStatus = (day: number) => {
    // AI Layer: Goal Fit vs Overload detection
    const eventCount = getEventCountForDay(day);
    if (eventCount === 0) return "free";
    if (eventCount <= 2) return "goal-fit";
    return "overload";
  };

  const renderCalendarGrid = () => {
    const days = [];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Week headers
    weekDays.forEach(day => {
      days.push(
        <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
          {day}
        </div>
      );
    });

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Calendar days
    for (let day = 1; day <= daysInMonth; day++) {
      const eventCount = getEventCountForDay(day);
      const status = getDayStatus(day);
      const isToday = new Date().getDate() === day && 
                     new Date().getMonth() === currentDate.getMonth() &&
                     new Date().getFullYear() === currentDate.getFullYear();

      days.push(
        <Card 
          key={day}
          className={`
            cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 min-h-24
            ${isToday ? 'ring-2 ring-primary' : ''}
            ${status === 'goal-fit' ? 'bg-green-50 border-green-200' : ''}
            ${status === 'overload' ? 'bg-red-50 border-red-200' : ''}
            ${selectedDay === day ? 'bg-primary/10 border-primary' : ''}
          `}
          onClick={() => setSelectedDay(selectedDay === day ? null : day)}
        >
          <CardContent className="p-2">
            <div className="flex justify-between items-start mb-1">
              <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                {day}
              </span>
              {eventCount > 0 && (
                <Badge variant="secondary" className="text-xs h-5 w-5 p-0 flex items-center justify-center">
                  {eventCount > 3 ? '3+' : eventCount}
                </Badge>
              )}
            </div>
            
            {/* Event previews (max 3) */}
            <div className="space-y-1">
              {eventCount > 0 && mockEvents.slice(0, Math.min(3, eventCount)).map((event, idx) => (
                <div key={idx} className="flex items-center gap-1 text-xs">
                  <div className="w-2 h-2 rounded-full bg-primary/60"></div>
                  <span className="truncate">{event.title}</span>
                </div>
              ))}
            </div>

            {/* Reminder badge */}
            {Math.random() > 0.7 && (
              <div className="flex items-center gap-1 mt-1">
                <Bell className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">3</span>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return days;
  };

  return (
    <AppLayout>
      <SEO 
        title="Month View | Calendar" 
        description="Macro overview of your wellness schedule with goal alignment insights" 
        canonical={window.location.href} 
      />
      <SubNavigation items={calendarSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Month View - Macro Overview 📅
                </h1>
                <p className="text-muted-foreground">
                  Identify busy/free periods and spot goal alignment at a glance
                </p>
              </div>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Event
              </Button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <h2 className="text-xl font-semibold">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* AI Insights */}
            <div className="mt-4 flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-200"></div>
                <span>Goal Fit Days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-200"></div>
                <span>Overload Days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                <span>Free Days</span>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <div className="grid grid-cols-7 gap-2">
              {renderCalendarGrid()}
            </div>
          </div>

          {/* Day Drawer - appears when day is selected */}
          {selectedDay && (
            <Card className="mt-6 bg-white/90 backdrop-blur-sm border border-white/20">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {monthNames[currentDate.getMonth()]} {selectedDay}, {currentDate.getFullYear()}
                </h3>
                
                <div className="space-y-3">
                  {mockEvents.map((event) => (
                    <Card key={event.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{event.time}</span>
                            </div>
                            <h4 className="font-medium">{event.title}</h4>
                            <Badge variant={event.status === 'confirmed' ? 'default' : 'secondary'}>
                              {event.status}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {event.attendees.map((attendee, idx) => (
                              <Avatar key={idx} className="w-6 h-6">
                                <AvatarImage src={attendee.avatar} />
                                <AvatarFallback className="text-xs">
                                  {attendee.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}