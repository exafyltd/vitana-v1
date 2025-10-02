import { Badge } from "@/components/ui/badge";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { Briefcase, Heart, Dumbbell, Coffee, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarFiltersProps {
  activeFilters: CalendarEvent['event_type'][];
  onToggleFilter: (filter: CalendarEvent['event_type']) => void;
}

const FILTER_CONFIG: Array<{
  type: CalendarEvent['event_type'];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}> = [
  {
    type: 'personal',
    label: 'Personal',
    icon: Heart,
    color: 'hsl(var(--sys-vitana-accent))',
    bgClass: 'bg-sys-vitana-tint',
    textClass: 'text-sys-vitana-accent',
    borderClass: 'border-sys-vitana-accent/30',
  },
  {
    type: 'community',
    label: 'Community',
    icon: Users,
    color: 'hsl(var(--domain-community-accent))',
    bgClass: 'bg-domain-community-tint',
    textClass: 'text-domain-community-accent',
    borderClass: 'border-domain-community-accent/30',
  },
  {
    type: 'professional',
    label: 'Work',
    icon: Briefcase,
    color: 'hsl(var(--pill-exercise-accent))',
    bgClass: 'bg-pill-exercise-tint',
    textClass: 'text-pill-exercise-accent',
    borderClass: 'border-pill-exercise-accent/30',
  },
  {
    type: 'health',
    label: 'Health',
    icon: Heart,
    color: 'hsl(var(--pill-mental-accent))',
    bgClass: 'bg-pill-mental-tint',
    textClass: 'text-pill-mental-accent',
    borderClass: 'border-pill-mental-accent/30',
  },
  {
    type: 'workout',
    label: 'Workout',
    icon: Dumbbell,
    color: 'hsl(var(--pill-exercise-accent))',
    bgClass: 'bg-pill-exercise-tint',
    textClass: 'text-pill-exercise-accent',
    borderClass: 'border-pill-exercise-accent/30',
  },
];

export function CalendarFilters({ activeFilters, onToggleFilter }: CalendarFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {FILTER_CONFIG.map(({ type, label, icon: Icon, color, bgClass, textClass, borderClass }) => {
        const isActive = activeFilters.includes(type);
        
        return (
          <Badge
            key={type}
            variant="outline"
            className={cn(
              "cursor-pointer transition-all text-xs h-7 px-2.5 gap-1.5 border",
              isActive ? cn(bgClass, textClass, borderClass) : "bg-muted/30 text-muted-foreground border-muted hover:bg-muted/50"
            )}
            onClick={() => onToggleFilter(type)}
          >
            <div 
              className="w-2 h-2 rounded-full shrink-0" 
              style={{ backgroundColor: isActive ? color : 'hsl(var(--muted-foreground))' }}
            />
            <Icon className="h-3 w-3" />
            <span>{label}</span>
          </Badge>
        );
      })}
    </div>
  );
}
