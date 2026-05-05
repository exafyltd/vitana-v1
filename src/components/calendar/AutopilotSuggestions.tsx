import { Sparkles, Clock, AlertTriangle, Focus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { t } from '@/lib/i18n-toast';

interface AutopilotSuggestion {
  id: string;
  type: 'fit' | 'conflict' | 'focus';
  title: string;
  description: string;
  event?: Partial<CalendarEvent>;
  suggestedTime?: Date;
}

interface AutopilotSuggestionsProps {
  suggestions: AutopilotSuggestion[];
  onAccept: (suggestion: AutopilotSuggestion) => void;
  onDismiss: (suggestionId: string) => void;
}

export function AutopilotSuggestions({ suggestions, onAccept, onDismiss }: AutopilotSuggestionsProps) {
  const getIcon = (type: AutopilotSuggestion['type']) => {
    switch (type) {
      case 'fit': return <Clock className="h-4 w-4" />;
      case 'conflict': return <AlertTriangle className="h-4 w-4" />;
      case 'focus': return <Focus className="h-4 w-4" />;
    }
  };

  const getColor = (type: AutopilotSuggestion['type']) => {
    switch (type) {
      case 'fit': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'conflict': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'focus': return 'text-purple-600 bg-purple-50 border-purple-200';
    }
  };

  if (suggestions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 pb-6 text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            {t('screens.calendar.noAutopilotSuggestionsAtMoment')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion) => (
        <Card key={suggestion.id} className={`border ${getColor(suggestion.type)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {getIcon(suggestion.type)}
              {suggestion.title}
              <Badge variant="outline" className="ml-auto text-xs">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                {t('screens.calendar.autopilot')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{suggestion.description}</p>
            
            {suggestion.suggestedTime && (
              <p className="text-xs font-medium">{t('screens.calendar.suggestedValue0', { value0: suggestion.suggestedTime.toLocaleString() })}</p>
            )}

            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => onAccept(suggestion)}
                className="flex-1"
              >
                {t('screens.calendar.accept')}
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onDismiss(suggestion.id)}
              >
                {t('screens.calendar.dismiss')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
