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
  Dumbbell,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useCalendarEvents, CalendarEvent } from '@/hooks/useCalendarEvents';

interface EnhancedCalendarPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getTypeColor = (type: CalendarEvent['event_type']) => {
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

const getTypeIcon = (type: CalendarEvent['event_type']) => {
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
  const { events, loading, addEvent, removeEvent, getEventsForDate, getUpcomingEvents } = useCalendarEvents();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("overview");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  // Form states for quick add
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventType, setNewEventType] = useState<CalendarEvent['event_type']>('personal');
  const [newEventLocation, setNewEventLocation] = useState("");
  
  // Use real events from the hook
  const upcomingEvents = getUpcomingEvents(6);
  const todayEvents = getEventsForDate(new Date());
  const conflictCount = events.filter(e => e.status === 'conflict').length;
  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getEventsForWeekDay = (date: Date) => {
    return getEventsForDate(date);
  };

  const handleQuickAdd = async () => {
    if (!newEventTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter an event title",
        variant: "destructive"
      });
      return;
    }

    try {
      const today = new Date();
      const [hours, minutes] = newEventTime ? newEventTime.split(':').map(Number) : [9, 0];
      const startTime = new Date(today);
      startTime.setHours(hours, minutes, 0, 0);

      await addEvent({
        title: newEventTitle,
        description: "",
        start_time: startTime.toISOString(),
        end_time: new Date(startTime.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour default
        location: newEventLocation || undefined,
        event_type: newEventType,
        status: 'confirmed',
        priority: 'medium',
        is_recurring: false,
        attendees_count: 0,
        has_rewards: false,
        source_type: 'manual',
        user_id: '' // This will be set by the hook
      });

      // Reset form
      setNewEventTitle("");
      setNewEventTime("");
      setNewEventLocation("");
      setShowQuickAdd(false);
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await removeEvent(eventId);
    } catch (error) {
      console.error('Error deleting event:', error);
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

  const formatEventTime = (startTime: string, endTime?: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000);
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
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
                                <Badge className={cn("text-xs px-2 py-0.5", getTypeColor(event.event_type))}>
                                  {getTypeIcon(event.event_type)}
                                  <span className="ml-1 capitalize">{event.event_type}</span>
                                </Badge>
                                {event.has_rewards && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-yellow-300 text-yellow-600">
                                    <Zap className="h-2.5 w-2.5 mr-0.5" />
                                    Rewards
                                  </Badge>
                                )}
                                {getStatusIcon(event.status)}
                              </div>
                              <h4 className="font-medium">{event.title}</h4>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatEventTime(event.start_time, event.end_time)}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </span>
                                )}
                                {event.attendees_count && event.attendees_count > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {event.attendees_count}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => setEditingEvent(event)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteEvent(event.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No events scheduled for today</p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => setActiveTab("create")}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Event
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Upcoming Events */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ChevronRight className="h-4 w-4" />
                      Upcoming Events
                      <Badge variant="secondary">{upcomingEvents.length} events</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {upcomingEvents.length > 0 ? (
                      <div className="space-y-2">
                        {upcomingEvents.map((event, idx) => (
                          <div key={event.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-2 h-2 rounded-full", getTypeColor(event.event_type).split(' ')[0])} />
                              <div>
                                <p className="font-medium text-sm">{event.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(event.start_time), 'MMM d')} • {formatEventTime(event.start_time, event.end_time)}
                                </p>
                              </div>
                            </div>
                            {getStatusIcon(event.status)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">No upcoming events</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* AI Recommendations */}
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-primary">
                      <Sparkles className="h-4 w-4" />
                      AI Schedule Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-900">📅 Optimal Meeting Time</p>
                      <p className="text-xs text-blue-700 mt-1">Tuesday 2-3 PM shows highest productivity based on your patterns</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm font-medium text-green-900">🏃‍♂️ Workout Reminder</p>
                      <p className="text-xs text-green-700 mt-1">You have a 30-minute gap at 5 PM - perfect for a quick workout</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSmartScheduling} className="w-full">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Get More Suggestions
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="week" className="flex-1 overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" onClick={() => handleNavigateWeek('prev')}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <h3 className="font-semibold">
                    {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => handleNavigateWeek('next')}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
                  Today
                </Button>
              </div>

              <ScrollArea className="h-[420px]">
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {weekDays.map((day, index) => {
                    const dayEvents = getEventsForWeekDay(day);
                    const isCurrentDay = isToday(day);
                    
                    return (
                      <div key={index} className={cn(
                        "space-y-2 p-2 rounded-lg border min-h-[120px]",
                        isCurrentDay ? "bg-primary/5 border-primary/20" : "bg-muted/20"
                      )}>
                        <div className="text-center">
                          <p className="text-xs font-medium text-muted-foreground">
                            {format(day, 'EEE')}
                          </p>
                          <p className={cn(
                            "text-sm font-semibold",
                            isCurrentDay ? "text-primary" : ""
                          )}>
                            {format(day, 'd')}
                          </p>
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              className={cn(
                                "text-xs p-1 rounded border-l-2 cursor-pointer hover:bg-white/50",
                                getTypeColor(event.event_type).split(' ')[0]
                              )}
                              onClick={() => setEditingEvent(event)}
                            >
                              <p className="font-medium truncate">{event.title}</p>
                              <p className="text-xs opacity-75">
                                {format(new Date(event.start_time), 'HH:mm')}
                              </p>
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center">
                              +{dayEvents.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="month" className="flex-1 overflow-hidden">
            <div className="flex gap-4 h-[500px]">
              <div className="flex-1">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                  disabled={false}
                />
              </div>
              <div className="w-80 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {format(selectedDate, 'MMMM d, yyyy')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getEventsForDate(selectedDate).length > 0 ? (
                      <div className="space-y-2">
                        {getEventsForDate(selectedDate).map((event) => (
                          <div key={event.id} className="flex items-center gap-2 p-2 rounded border">
                            <div className={cn("w-3 h-3 rounded-full", getTypeColor(event.event_type).split(' ')[0])} />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{event.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatEventTime(event.start_time, event.end_time)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No events scheduled</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="create" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[500px]">
              <div className="space-y-6 pr-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Add Event</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Event Title</Label>
                      <Input
                        id="title"
                        placeholder="Enter event title..."
                        value={newEventTitle}
                        onChange={(e) => setNewEventTitle(e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="time">Time</Label>
                        <Input
                          id="time"
                          type="time"
                          value={newEventTime}
                          onChange={(e) => setNewEventTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select value={newEventType} onValueChange={(value: CalendarEvent['event_type']) => setNewEventType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="personal">Personal</SelectItem>
                            <SelectItem value="community">Community</SelectItem>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="health">Health</SelectItem>
                            <SelectItem value="workout">Workout</SelectItem>
                            <SelectItem value="nutrition">Nutrition</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="location">Location (Optional)</Label>
                      <Input
                        id="location"
                        placeholder="Enter location..."
                        value={newEventLocation}
                        onChange={(e) => setNewEventLocation(e.target.value)}
                      />
                    </div>
                    
                    <Button onClick={handleQuickAdd} className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-2" />
                          Add Event
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSyncExternal}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Sync External
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/calendar')}>
              <ExternalLink className="h-3 w-3 mr-1" />
              Full Calendar
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}