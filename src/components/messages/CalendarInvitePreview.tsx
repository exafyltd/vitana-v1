import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, MapPin, Users, CheckCircle, X, Loader2 } from 'lucide-react';
import { t } from '@/lib/i18n-toast';

interface CalendarInvitePreviewProps {
  contentData?: any;
  content?: string;
  status?: 'sending' | 'failed';
  onRetry?: () => void;
}

export const CalendarInvitePreview: React.FC<CalendarInvitePreviewProps> = ({
  contentData,
  content,
  status = 'sending',
  onRetry
}) => {
  return (
    <Card className="max-w-sm border-primary/20 opacity-70">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {t('screens.messages.calendarInvite')}
          </Badge>
          {status === 'sending' && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t('screens.messages.sending')}
            </div>
          )}
          {status === 'failed' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs"
              onClick={onRetry}
            >
              {t('screens.messages.retry')}
            </Button>
          )}
        </div>
        
        <div className="space-y-2 mb-4">
          <h4 className="font-semibold text-base">
            {contentData?.title || 'Event Invitation'}
          </h4>
          
          {contentData?.date ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                {contentData.date}
                {contentData?.time && ` at ${contentData.time}`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Skeleton className="h-4 w-32" />
            </div>
          )}
          
          {contentData?.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{contentData.location}</span>
            </div>
          )}
          
          {contentData?.attendees && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{contentData.attendees} attendees</span>
            </div>
          )}
          
          {content && (
            <p className="text-sm text-muted-foreground border-l-2 border-muted pl-3 mt-3">
              {content.replace(/^Calendar invite: /, '')}
            </p>
          )}
        </div>
        
        {/* Preview action buttons - disabled */}
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700 opacity-50"
            disabled
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            {t('screens.messages.accept')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 opacity-50"
            disabled
          >
            <X className="w-3 h-3 mr-1" />
            {t('screens.messages.decline')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="opacity-50"
            disabled
          >
            <Clock className="w-3 h-3 mr-1" />
            {t('screens.messages.maybe')}
          </Button>
        </div>
        
        {status === 'failed' && (
          <div className="text-xs text-destructive mt-2">
            Failed to send invite
          </div>
        )}
      </CardContent>
    </Card>
  );
};