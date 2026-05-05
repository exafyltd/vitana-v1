import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseCalendarNL } from "@/lib/parseCalendarNL";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { t } from '@/lib/i18n-toast';

interface NaturalLanguageInputProps {
  onEventCreate: (event: Partial<CalendarEvent>) => void;
  onCancel?: () => void;
}

export function NaturalLanguageInput({ onEventCreate, onCancel }: NaturalLanguageInputProps) {
  const [input, setInput] = useState("");
  const [parsedEvent, setParsedEvent] = useState<Partial<CalendarEvent> | null>(null);

  const handleParse = () => {
    if (!input.trim()) return;
    
    const parsed = parseCalendarNL(input);
    setParsedEvent(parsed);
  };

  const handleCreate = () => {
    if (parsedEvent) {
      onEventCreate(parsedEvent);
      setInput("");
      setParsedEvent(null);
    }
  };

  const handleCancel = () => {
    setInput("");
    setParsedEvent(null);
    onCancel?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            placeholder={t('screens.calendar.eGLunchWithAnaTomorrow')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !parsedEvent) {
                handleParse();
              } else if (e.key === 'Enter' && parsedEvent) {
                handleCreate();
              }
            }}
            className="pr-10"
          />
          <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        </div>
        {!parsedEvent ? (
          <Button onClick={handleParse} disabled={!input.trim()}>
            Parse
          </Button>
        ) : (
          <Button onClick={handleCancel} variant="outline">
            Clear
          </Button>
        )}
      </div>

      {parsedEvent && (
        <Card className="p-3 space-y-3 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Event Preview
            </h4>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">{t('screens.calendar.title')} </span>
              <span className="font-medium">{parsedEvent.title}</span>
            </div>

            {parsedEvent.start_time && (
              <div>
                <span className="text-muted-foreground">{t('screens.calendar.when')} </span>
                <span>{new Date(parsedEvent.start_time).toLocaleString()}</span>
              </div>
            )}

            {parsedEvent.location && (
              <div>
                <span className="text-muted-foreground">{t('screens.calendar.location')} </span>
                <span>{parsedEvent.location}</span>
              </div>
            )}

            {parsedEvent.event_type && (
              <div>
                <Badge variant="outline" className="text-xs">
                  {parsedEvent.event_type}
                </Badge>
              </div>
            )}
          </div>

          <Button onClick={handleCreate} className="w-full">
            Create Event
          </Button>
        </Card>
      )}
    </div>
  );
}
