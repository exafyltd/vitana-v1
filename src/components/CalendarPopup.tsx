import React, { useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { 
  Calendar,
  Clock, 
  ChevronRight, 
  Settings, 
  Plus,
  AlertTriangle,
  Users,
  MapPin,
  Zap,
  Sparkles,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  type: 'personal' | 'community' | 'professional' | 'health';
  status: 'confirmed' | 'pending' | 'conflict';
  location?: string;
  attendees?: number;
  hasRewards?: boolean;
}

interface CalendarPopupProps {
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
    hasRewards: true
  },
  {
    id: '2',
    title: 'Dr. Roberts Consultation',
    time: '11:30 AM',
    type: 'health',
    status: 'confirmed',
    location: 'Vitana Clinic',
    attendees: 2
  },
  {
    id: '3',
    title: 'Community Meetup',
    time: '2:00 PM',
    type: 'community',
    status: 'pending',
    location: 'Central Park',
    attendees: 12,
    hasRewards: true
  },
  {
    id: '4',
    title: 'Evening Workout',
    time: '6:00 PM',
    type: 'personal',
    status: 'conflict',
    location: 'Fitness Center'
  }
];

const getTypeColor = (type: CalendarEvent['type']) => {
  switch (type) {
    case 'personal': return 'bg-blue-500/20 text-blue-600';
    case 'community': return 'bg-purple-500/20 text-purple-600';
    case 'professional': return 'bg-green-500/20 text-green-600';
    case 'health': return 'bg-red-500/20 text-red-600';
    default: return 'bg-gray-500/20 text-gray-600';
  }
};

const getStatusIcon = (status: CalendarEvent['status']) => {
  switch (status) {
    case 'conflict': return <AlertTriangle className="h-3 w-3 text-amber-500" />;
    case 'pending': return <Clock className="h-3 w-3 text-blue-500" />;
    default: return null;
  }
};

export function CalendarPopup({ open, onOpenChange }: CalendarPopupProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentRole } = useRole();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  
  const upcomingEvents = mockEvents.slice(0, 4);
  const conflictCount = mockEvents.filter(e => e.status === 'conflict').length;
  
  const handleViewFullCalendar = () => {
    onOpenChange(false);
    navigate('/calendar');
  };
  
  const handleQuickAdd = () => {
    setShowQuickAdd(true);
    toast({
      title: "Quick Add",
      description: "Event creation form coming soon"
    });
  };

  const handleSyncExternal = () => {
    toast({
      title: "External Sync",
      description: "Connecting to external calendars..."
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400/20 to-purple-500/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <span>Calendar</span>
            <Badge variant="outline" className="ml-auto">
              Next {upcomingEvents.length} Events
            </Badge>
            {conflictCount > 0 && (
              <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600">
                {conflictCount} Conflicts
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Your upcoming schedule and events
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[400px]">
          <div className="space-y-4 pr-4">
            {/* Quick Add Section */}
            <Card>
              <CardContent className="p-3">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-muted-foreground hover:text-primary"
                  onClick={handleQuickAdd}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Event
                </Button>
              </CardContent>
            </Card>

            {/* Events List */}
            <div className="space-y-2">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <Card key={event.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
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
                        
                        <Badge variant="secondary" className={cn("text-xs", getTypeColor(event.type))}>
                          {event.type}
                        </Badge>
                      </div>
                      
                      <Button variant="ghost" size="sm" className="ml-2">
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-6 text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">No upcoming events</p>
                  <Button variant="outline" size="sm" onClick={handleQuickAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Event
                  </Button>
                </Card>
              )}
            </div>

            {/* Autopilot Integration */}
            {upcomingEvents.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">AI Suggestions</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Find better slot
                    </Badge>
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
                      <Zap className="h-3 w-3 mr-1" />
                      Prepare brief
                    </Badge>
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Share availability
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full">
            <Button variant="outline" size="sm" onClick={handleSyncExternal}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync External
            </Button>
            <Button variant="outline" size="sm" onClick={handleQuickAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
          <Button onClick={handleViewFullCalendar} className="w-full sm:w-auto">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Full Calendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}