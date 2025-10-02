import React, { useState } from "react";
import { Plane, Target, AlertTriangle, Check, X, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface AutopilotSuggestion {
  id: string;
  type: 'focus-block' | 'conflict-resolution' | 'fit-event';
  title: string;
  description: string;
  suggestedTime?: string;
  conflictsWith?: string;
  accepted?: boolean;
  snoozed?: boolean;
  snoozeUntil?: string;
}

interface AutopilotCalendarSuggestionsProps {
  suggestions: AutopilotSuggestion[];
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onUndo: (id: string) => void;
  onSnooze?: (id: string, until: 'later-today' | 'tomorrow') => void;
}

const getSuggestionIcon = (type: AutopilotSuggestion['type']) => {
  switch (type) {
    case 'fit-event':
      return Clock;
    case 'conflict-resolution':
      return AlertTriangle;
    case 'focus-block':
      return Target;
  }
};

const getSuggestionColor = (type: AutopilotSuggestion['type']) => {
  switch (type) {
    case 'fit-event':
      return 'bg-sys-autopilot-tint text-sys-autopilot-accent border-sys-autopilot-accent/20';
    case 'conflict-resolution':
      return 'bg-sys-noti-accent/10 text-sys-noti-accent border-sys-noti-accent/20';
    case 'focus-block':
      return 'bg-pill-mental-tint text-pill-mental-accent border-pill-mental-accent/20';
  }
};

export function AutopilotCalendarSuggestions({ 
  suggestions, 
  onAccept, 
  onDismiss,
  onUndo,
  onSnooze
}: AutopilotCalendarSuggestionsProps) {
  const visibleSuggestions = suggestions.filter(s => !s.snoozed);
  if (visibleSuggestions.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Plane className="h-4 w-4 text-sys-autopilot-accent" />
        <h3 className="text-sm font-semibold">Autopilot Suggestions</h3>
        <Badge variant="secondary" className="text-xs ml-auto">{visibleSuggestions.length}</Badge>
      </div>

      {visibleSuggestions.map((suggestion) => {
        const Icon = getSuggestionIcon(suggestion.type);
        
        return (
          <Card
            key={suggestion.id}
            className={cn(
              "p-4 border transition-all animate-fade-in",
              suggestion.accepted 
                ? "bg-sys-autopilot-tint/50 border-sys-autopilot-accent/30" 
                : "bg-background hover:bg-muted/30 hover:shadow-md"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border",
                getSuggestionColor(suggestion.type)
              )}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="text-sm font-semibold">{suggestion.title}</h5>
                    {suggestion.accepted && (
                      <Badge variant="secondary" className="text-xs bg-sys-autopilot-tint text-sys-autopilot-accent border border-sys-autopilot-accent/20">
                        <Plane className="h-3 w-3 mr-1" />
                        Autopilot
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-3">
                  {suggestion.description}
                </p>

                {suggestion.suggestedTime && (
                  <p className="text-xs text-sys-autopilot-accent mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {suggestion.suggestedTime}
                  </p>
                )}

                {suggestion.conflictsWith && (
                  <p className="text-xs text-sys-noti-accent mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Conflicts with: {suggestion.conflictsWith}
                  </p>
                )}

                {!suggestion.accepted ? (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => onAccept(suggestion.id)}
                      className="gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Accept
                    </Button>
                    {onSnooze && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="gap-1.5"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            Snooze
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onSnooze(suggestion.id, 'later-today')}>
                            Later today
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onSnooze(suggestion.id, 'tomorrow')}>
                            Tomorrow
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onDismiss(suggestion.id)}
                      className="gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      Dismiss
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onUndo(suggestion.id)}
                      className="gap-1.5 h-7 text-xs"
                    >
                      Undo
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
