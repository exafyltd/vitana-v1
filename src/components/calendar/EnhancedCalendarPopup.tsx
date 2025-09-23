import React, { useState } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { 
  Calendar,
  Clock, 
  ChevronRight, 
  ChevronLeft,
  Settings, 
  Plus,
  AlertTriangle,
  Users,
  MapPin,
  Zap,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Edit,
  Trash2,
  X,
  CheckCircle,
  Bell,
  Video,
  Coffee,
  Heart,
  Dumbbell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  type: 'personal' | 'community' | 'professional' | 'health' | 'workout' | 'nutrition';
  status: 'confirmed' | 'pending' | 'conflict';
  location?: string;
  attendees?: number;
  hasRewards?: boolean;
  description?: string;
  duration?: number; // in minutes
  date: Date;
  recurring?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

interface EnhancedCalendarPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Morning Yoga Session',
    time: '9:00 AM',
    type: 'personal',
    status: 'confirmed',
    location: 'Home Studio',
    hasRewards: true,
    description: 'Start your day with mindful movement',
    duration: 60,
    date: new Date(),
    priority: 'medium'
  },
  {
    id: '2',
    title: 'Dr. Roberts Consultation',
    time: '11:30 AM',
    type: 'health',
    status: 'confirmed',
    location: 'Vitana Clinic',
    attendees: 2,
    description: 'Quarterly health checkup',
    duration: 30,
    date: new Date(),
    priority: 'high'
  },
  {
    id: '3',
    title: 'Community Meetup',
    time: '2:00 PM',
    type: 'community',
    status: 'pending',
    location: 'Central Park',
    attendees: 12,
    hasRewards: true,
    description: 'Weekly wellness community gathering',
    duration: 120,
    date: new Date(),
    priority: 'medium'
  },
  {
    id: '4',
    title: 'Evening Workout',
    time: '6:00 PM',
    type: 'workout',
    status: 'conflict',
    location: 'Fitness Center',
    description: 'HIIT training session',
    duration: 45,
    date: new Date(),
    priority: 'medium'
  },
  {
    id: '5',
    title: 'Nutrition Consultation',
    time: '10:00 AM',
    type: 'nutrition',
    status: 'confirmed',
    location: 'Wellness Center',
    attendees: 1,
    description: 'Monthly nutrition plan review',
    duration: 60,
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    priority: 'high'
  }
];

const getTypeColor = (type: CalendarEvent['type']) => {
  switch (type) {
    case 'personal': return 'bg-blue-500/20 text-blue-600 border-blue-200';
    case 'community': return 'bg-purple-500/20 text-purple-600 border-purple-200';
    case 'professional': return 'bg-green-500/20 text-green-600 border-green-200';
    case 'health': return 'bg-red-500/20 text-red-600 border-red-200';
    case 'workout': return 'bg-orange-500/20 text-orange-600 border-orange-200';
    case 'nutrition': return 'bg-emerald-500/20 text-emerald-600 border-emerald-200';
    default: return 'bg-gray-500/20 text-gray-600 border-gray-200';
  }
};

const getTypeIcon = (type: CalendarEvent['type']) => {
  switch (type) {
    case 'personal': return <Heart className="h-3 w-3" />;
    case 'community': return <Users className="h-3 w-3" />;
    case 'professional': return <Users className="h-3 w-3" />;
    case 'health': return <Heart className="h-3 w-3" />;
    case 'workout': return <Dumbbell className="h-3 w-3" />;
    case 'nutrition': return <Coffee className="h-3 w-3" />;
    default: return <Calendar className="h-3 w-3" />;
  }
};

const getStatusIcon = (status: CalendarEvent['status']) => {
  switch (status) {
    case 'conflict': return <AlertTriangle className="h-3 w-3 text-amber-500" />;
    case 'pending': return <Clock className="h-3 w-3 text-blue-500" />;
    case 'confirmed': return <CheckCircle className="h-3 w-3 text-green-500" />;
    default: return null;
  }
};

const getPriorityColor = (priority: CalendarEvent['priority']) => {
  switch (priority) {
    case 'high': return 'border-l-red-500';
    case 'medium': return 'border-l-yellow-500';
    case 'low': return 'border-l-gray-400';
    default: return 'border-l-gray-300';
  }
};

export function EnhancedCalendarPopup({ open, onOpenChange }: EnhancedCalendarPopupProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("overview");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  // Form states for quick add
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventType, setNewEventType] = useState<CalendarEvent['type']>('personal');
  const [newEventLocation, setNewEventLocation] = useState("");
  
  const upcomingEvents = mockEvents.filter(e => e.date >= new Date()).slice(0, 6);
  const todayEvents = mockEvents.filter(e => isSameDay(e.date, new Date()));
  const conflictCount = mockEvents.filter(e => e.status === 'conflict').length;
  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const handleViewFullCalendar = () => {
    onOpenChange(false);
    navigate('/calendar');
  };
  
  const handleQuickAdd = () => {
    if (!newEventTitle || !newEventTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in title and time",
        variant: "destructive"
      });
      return;
    }
    
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: newEventTitle,
      time: newEventTime,
      type: newEventType,
      status: 'confirmed',
      location: newEventLocation,
      date: selectedDate,
      priority: 'medium'
    };
    
    // Add to mockEvents (in real app, this would be an API call)
    mockEvents.push(newEvent);
    
    toast({
      title: "Event Created",
      description: `${newEventTitle} added to your calendar`
    });
    
    // Reset form
    setNewEventTitle("");
    setNewEventTime("");
    setNewEventLocation("");
    setShowQuickAdd(false);
  };

  const handleDeleteEvent = (eventId: string) => {
    // In real app, this would be an API call
    const eventIndex = mockEvents.findIndex(e => e.id === eventId);
    if (eventIndex > -1) {
      const event = mockEvents[eventIndex];
      mockEvents.splice(eventIndex, 1);
      toast({
        title: "Event Deleted",
        description: `${event.title} has been removed`
      });
    }
  };

  const handleSyncExternal = () => {
    toast({
      title: "External Sync",
      description: "Connecting to Google Calendar and Outlook...",
      action: (
        <Button variant="outline" size="sm">
          <Settings className="h-3 w-3 mr-1" />
          Settings
        </Button>
      )
    });
  };

  const handleNavigateWeek = (direction: 'prev' | 'next') => {
    const days = direction === 'next' ? 7 : -7;
    setCurrentWeek(new Date(currentWeek.getTime() + days * 24 * 60 * 60 * 1000));
  };

  const handleSmartScheduling = () => {
    toast({
      title: "AI Scheduling Assistant",
      description: "Finding optimal time slots based on your patterns...",
      action: (
        <Button variant="outline" size="sm">
          <Sparkles className="h-3 w-3 mr-1" />
          View Suggestions
        </Button>
      )
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400/20 to-purple-500/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <span>Smart Calendar</span>
            <Badge variant="outline" className="ml-auto">
              {upcomingEvents.length} Upcoming
            </Badge>
            {conflictCount > 0 && (
              <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600">
                {conflictCount} Conflicts
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Full calendar management with AI-powered scheduling
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="week">Week View</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="create">Quick Add</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 pr-4">
                {/* Today's Schedule */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Today's Schedule
                      <Badge variant="secondary">{todayEvents.length} events</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {todayEvents.length > 0 ? (
                      todayEvents.map((event) => (
                        <Card key={event.id} className={cn("p-3 border-l-4", getPriorityColor(event.priority))}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                {getTypeIcon(event.type)}
                                <span className="font-medium text-sm">{event.title}</span>
                                {event.hasRewards && (
                                  <div className="w-2 h-2 rounded-full bg-purple-500" title="Rewards Available" />
                                )}
                                {getStatusIcon(event.status)}
                              </div>
                              
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {event.time}
                                  {event.duration && <span>({event.duration}min)</span>}
                                </div>
                                
                                {event.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </div>
                                )}
                                
                                {event.attendees && (
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {event.attendees}
                                  </div>
                                )}
                              </div>
                              
                              {event.description && (
                                <p className="text-xs text-muted-foreground">{event.description}</p>
                              )}
                              
                              <Badge variant="secondary" className={cn("text-xs w-fit", getTypeColor(event.type))}>
                                {event.type}
                              </Badge>
                            </div>
                            
                            <div className="flex gap-1 ml-2">
                              <Button variant="ghost" size="sm" onClick={() => setEditingEvent(event)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteEvent(event.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No events today</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Upcoming Events */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ChevronRight className="h-4 w-4" />
                      Next 6 Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {upcomingEvents.map((event) => (
                      <Card key={event.id} className="p-3 hover:bg-accent/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getTypeIcon(event.type)}
                            <div>
                              <p className="font-medium text-sm">{event.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(event.date, 'MMM dd')} at {event.time}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className={cn("text-xs", getTypeColor(event.type))}>
                            {event.type}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </CardContent>
                </Card>

                {/* AI Suggestions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={handleSmartScheduling}>
                        <Zap className="h-3 w-3 mr-2" />
                        Smart Scheduling
                      </Button>
                      <Button variant="outline" size="sm">
                        <Video className="h-3 w-3 mr-2" />
                        Virtual Options
                      </Button>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Reschedule Conflicts
                      </Button>
                      <Button variant="outline" size="sm">
                        <Bell className="h-3 w-3 mr-2" />
                        Set Reminders
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="week" className="flex-1 overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleNavigateWeek('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleNavigateWeek('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <Card key={day.toString()} className={cn("p-3", isToday(day) && "bg-primary/5 border-primary/20")}>
                    <div className="text-center">
                      <p className="text-xs font-medium">{format(day, 'EEE')}</p>
                      <p className={cn("text-lg", isToday(day) && "text-primary font-bold")}>
                        {format(day, 'd')}
                      </p>
                      <div className="mt-2 space-y-1">
                        {mockEvents
                          .filter(event => isSameDay(event.date, day))
                          .slice(0, 2)
                          .map(event => (
                            <div key={event.id} className={cn("text-xs p-1 rounded", getTypeColor(event.type))}>
                              {event.title}
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="month" className="flex-1 overflow-hidden">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border w-full"
            />
          </TabsContent>

          <TabsContent value="create" className="flex-1 overflow-hidden">
            <Card>
              <CardHeader>
                <CardTitle>Create New Event</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="Enter event title"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={newEventTime}
                      onChange={(e) => setNewEventTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select value={newEventType} onValueChange={(value: CalendarEvent['type']) => setNewEventType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="health">Health</SelectItem>
                        <SelectItem value="workout">Workout</SelectItem>
                        <SelectItem value="nutrition">Nutrition</SelectItem>
                        <SelectItem value="community">Community</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input
                    id="location"
                    value={newEventLocation}
                    onChange={(e) => setNewEventLocation(e.target.value)}
                    placeholder="Enter location"
                  />
                </div>
                
                <Button onClick={handleQuickAdd} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full">
            <Button variant="outline" size="sm" onClick={handleSyncExternal}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync External
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActiveTab("create")}>
              <Plus className="h-4 w-4 mr-2" />
              Quick Add
            </Button>
          </div>
          <Button onClick={handleViewFullCalendar} className="w-full sm:w-auto">
            <ExternalLink className="h-4 w-4 mr-2" />
            Full Calendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}