import React from "react";
import { format } from "date-fns";
import { de as deLocale } from "date-fns/locale/de";
import { useTranslation } from "@/hooks/useTranslation";
import { Clock, MapPin, Users, Video, MessageSquare, UserPlus, Edit, Trash2, X, Share2, Zap, Bell, Tag, Paperclip, Calendar as CalendarIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface EventDetailsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  onInvite?: (event: CalendarEvent) => void;
  onShare?: (event: CalendarEvent) => void;
  onJoin?: (event: CalendarEvent) => void;
  onMessage?: (event: CalendarEvent) => void;
  onReschedule?: (event: CalendarEvent) => void;
}

const getTypeColor = (type: CalendarEvent['event_type']) => {
  switch (type) {
    case 'personal': return 'bg-sys-vitana-tint text-sys-vitana-accent border-sys-vitana-accent/20';
    case 'community': return 'bg-domain-community-tint text-domain-community-accent border-domain-community-accent/20';
    case 'professional': return 'bg-pill-exercise-tint text-pill-exercise-accent border-pill-exercise-accent/20';
    case 'health': return 'bg-pill-mental-tint text-pill-mental-accent border-pill-mental-accent/20';
    case 'workout': return 'bg-pill-exercise-tint text-pill-exercise-accent border-pill-exercise-accent/20';
    case 'nutrition': return 'bg-pill-nutrition-tint text-pill-nutrition-accent border-pill-nutrition-accent/20';
    default: return 'bg-util-calendar-tint text-util-calendar-accent border-util-calendar-accent/20';
  }
};

export function EventDetailsPanel({
  open,
  onOpenChange,
  event,
  onEdit,
  onDelete,
  onInvite,
  onShare,
  onJoin,
  onMessage,
  onReschedule
}: EventDetailsPanelProps) {
  const { isGerman } = useTranslation();
  const dateLocale = isGerman ? deLocale : undefined;

  // Close panel on ESC key
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onOpenChange]);

  if (!event) return null;

  const formatEventTime = (startTime: string, endTime?: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000);
    return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg" side="right">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <SheetTitle className="text-xl">{event.title}</SheetTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn("text-xs", getTypeColor(event.event_type))}>
                  {event.event_type}
                </Badge>
                {event.has_rewards && (
                  <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-600">
                    <Zap className="h-2.5 w-2.5 mr-0.5" />
                    {t('screens.calendar.text10Credits')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] mt-6">
          <div className="space-y-5 pr-4">
            {/* Primary Actions */}
            <div className="flex gap-2">
              {onJoin && (
                <Button className="flex-1 gap-2" onClick={() => onJoin(event)}>
                  <Video className="h-4 w-4" />
                  {t('screens.calendar.join')}
                </Button>
              )}
              {onMessage && (
                <Button variant="outline" className="flex-1 gap-2" onClick={() => onMessage(event)}>
                  <MessageSquare className="h-4 w-4" />
                  {t('screens.calendar.message')}
                </Button>
              )}
            </div>

            <Separator />

            {/* Time */}
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold">
                  {format(new Date(event.start_time), 'EEEE, MMMM d, yyyy', { locale: dateLocale })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatEventTime(event.start_time, event.end_time)}
                </p>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">{event.location}</p>
                  <Button variant="link" className="h-auto p-0 text-xs text-muted-foreground" asChild>
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`} target="_blank" rel="noopener noreferrer">
                      {t('screens.calendar.openMaps')}
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* Attendees */}
            {event.attendees_count && event.attendees_count > 0 && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t('screens.calendar.attendees_countAttendees', { attendees_count: event.attendees_count })}</p>
                  <p className="text-xs text-muted-foreground">{t('screens.calendar.includingYou')}</p>
                </div>
              </div>
            )}

            {/* Description/Notes */}
            {event.description && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {t('screens.calendar.notes')}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
                </div>
              </>
            )}

            {/* Reminders */}
            <div className="space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {t('screens.calendar.reminders')}
              </p>
              <div className="text-sm text-muted-foreground">
                <p>{t('screens.calendar.text15MinutesBefore')}</p>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {t('screens.calendar.tags')}
              </p>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">{event.event_type}</Badge>
                {event.priority && (
                  <Badge variant="secondary" className="text-xs capitalize">{t('screens.calendar.priorityPriority', { priority: event.priority })}</Badge>
                )}
              </div>
            </div>

            {/* Attachments placeholder */}
            <div className="space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                {t('screens.calendar.attachments')}
              </p>
              <p className="text-xs text-muted-foreground">{t('screens.calendar.noAttachments')}</p>
            </div>

            <Separator />

            {/* Secondary Actions */}
            <div className="space-y-2">
              {onInvite && (
                <Button className="w-full justify-start" variant="outline" onClick={() => onInvite(event)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('screens.calendar.invite')}
                </Button>
              )}

              {onReschedule && (
                <Button className="w-full justify-start" variant="outline" onClick={() => onReschedule(event)}>
                  <Clock className="h-4 w-4 mr-2" />
                  {t('screens.calendar.reschedule')}
                </Button>
              )}

              {onShare && (
                <Button className="w-full justify-start" variant="outline" onClick={() => onShare(event)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  {t('screens.calendar.share')}
                </Button>
              )}

              <Separator className="my-2" />

              {onEdit && (
                <Button className="w-full justify-start" variant="outline" onClick={() => onEdit(event)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('screens.calendar.editEvent')}
                </Button>
              )}

              {onDelete && (
                <Button 
                  className="w-full justify-start text-destructive hover:text-destructive" 
                  variant="outline"
                  onClick={() => {
                    onDelete(event.id);
                    onOpenChange(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('screens.calendar.deleteEvent')}
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
