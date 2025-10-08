import { isToday, isYesterday, isThisWeek, format } from "date-fns";

interface DateGroupHeaderProps {
  date: Date;
}

export function DateGroupHeader({ date }: DateGroupHeaderProps) {
  const getDateLabel = (date: Date): string => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isThisWeek(date, { weekStartsOn: 0 })) return "This Week";
    return format(date, "MMMM d, yyyy");
  };

  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-3 mb-4">
      <h3 className="text-sm font-semibold text-foreground">{getDateLabel(date)}</h3>
      <div className="h-px bg-border mt-2" />
    </div>
  );
}
