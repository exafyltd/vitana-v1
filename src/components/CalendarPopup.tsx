import React, { useState } from "react";
import { startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, addDays } from 'date-fns';
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
  Edit,
  Trash2,
  CheckCircle,
  Bell,
  Video,
  Coffee,
  Heart,
  Dumbbell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { useTranslation } from "@/hooks/useTranslation";
import { t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
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
  date?: Date;
  priority?: 'low' | 'medium' | 'high';
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
    date: addDays(new Date(), 1), // Tomorrow
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

export function CalendarPopup({ open, onOpenChange }: CalendarPopupProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentRole } = useRole();
  const { translate } = useTranslation();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  
  const upcomingEvents = mockEvents.slice(0, 4);
  const conflictCount = mockEvents.filter(e => e.status === 'conflict').length;
  
  
  const handleQuickAdd = () => {
    setShowQuickAdd(true);
    toast({
      title: translate('calendarPopup.quickAdd'),
      description: translate('calendarPopup.eventFormComingSoon')
    });
  };

  const handleSyncExternal = () => {
    toast({
      title: translate('calendarPopup.externalSync'),
      description: translate('calendarPopup.connectingCalendars')
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
            <span>{translate('calendarPopup.title')}</span>
            <Badge variant="outline" className="ml-auto">
              {translate('calendarPopup.nextEvents').replace('{count}', String(upcomingEvents.length))}
            </Badge>
            {conflictCount > 0 && (
              <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600">
                {translate('calendarPopup.conflicts').replace('{count}', String(conflictCount))}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {translate('calendarPopup.upcomingSchedule')}
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
                  {translate('calendarPopup.addNewEvent')}
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
                            <div className="w-2 h-2 rounded-full bg-purple-500" title={t('screens.common.rewardsAvailable')} />
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
                  <p className="text-sm text-muted-foreground mb-3">{translate('calendarPopup.noUpcomingEvents')}</p>
                  <Button variant="outline" size="sm" onClick={handleQuickAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    {translate('calendarPopup.createFirstEvent')}
                  </Button>
                </Card>
              )}
            </div>

            {/* Autopilot Integration */}
            {upcomingEvents.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{translate('calendarPopup.aiSuggestions')}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {translate('calendarPopup.findBetterSlot')}
                    </Badge>
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
                      <Zap className="h-3 w-3 mr-1" />
                      {translate('calendarPopup.prepareBrief')}
                    </Badge>
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {translate('calendarPopup.shareAvailability')}
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
              {translate('calendarPopup.syncExternal')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleQuickAdd}>
              <Plus className="h-4 w-4 mr-2" />
              {translate('calendarPopup.addEvent')}
            </Button>
          </div>
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {translate('common.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}