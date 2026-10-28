import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, X, Clock, Users } from 'lucide-react';
import { CalendarInviteResponse } from '@/hooks/useCalendarEvents';
import { t } from '@/lib/i18n-toast';

interface InviteResponseSummaryProps {
  responses: CalendarInviteResponse[];
}

export const InviteResponseSummary: React.FC<InviteResponseSummaryProps> = ({ responses }) => {
  const acceptedCount = responses.filter(r => r.response === 'accepted').length;
  const declinedCount = responses.filter(r => r.response === 'declined').length;
  const maybeCount = responses.filter(r => r.response === 'maybe').length;
  const totalResponses = responses.length;

  if (totalResponses === 0) {
    return (
      <div className="mt-3">
        <Badge variant="secondary" className="bg-muted text-muted-foreground border-border">
          <Users className="w-3 h-3 me-1" />
          {t('screens.messages.noResponsesYet')}
        </Badge>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {acceptedCount > 0 && (
          <Badge variant="secondary" className="bg-status-success-subtle text-status-success border-status-success/25">
            <CheckCircle className="w-3 h-3 me-1" />{t('screens.messages.acceptedcountAccepted', { acceptedCount })}
          </Badge>
        )}
        {declinedCount > 0 && (
          <Badge variant="secondary" className="bg-status-error-subtle text-status-error border-status-error/25">
            <X className="w-3 h-3 me-1" />{t('screens.messages.declinedcountDeclined', { declinedCount })}
          </Badge>
        )}
        {maybeCount > 0 && (
          <Badge variant="secondary" className="bg-status-warning-subtle text-status-warning border-status-warning/25">
            <Clock className="w-3 h-3 me-1" />{t('screens.messages.maybecountMaybe', { maybeCount })}
          </Badge>
        )}
      </div>
      <div className="text-sm text-muted-foreground">{t('screens.messages.totalresponsesResponseValue1Received', { totalResponses, value1: totalResponses !== 1 ? 's' : '' })}
      </div>
    </div>
  );
};