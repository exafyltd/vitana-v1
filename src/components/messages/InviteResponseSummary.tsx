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
        <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200">
          <Users className="w-3 h-3 mr-1" />
          {t('screens.messages.noResponsesYet')}
        </Badge>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {acceptedCount > 0 && (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            {acceptedCount} accepted
          </Badge>
        )}
        {declinedCount > 0 && (
          <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
            <X className="w-3 h-3 mr-1" />
            {declinedCount} declined
          </Badge>
        )}
        {maybeCount > 0 && (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            {maybeCount} maybe
          </Badge>
        )}
      </div>
      <div className="text-sm text-muted-foreground">
        {totalResponses} response{totalResponses !== 1 ? 's' : ''} received
      </div>
    </div>
  );
};