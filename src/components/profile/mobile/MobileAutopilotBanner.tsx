import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileAutopilotBannerProps {
  onTry?: () => void;
  className?: string;
}

export function MobileAutopilotBanner({
  onTry,
  className
}: MobileAutopilotBannerProps) {
  return (
    <div className={cn(
      "mx-4 my-3 px-3 py-2.5 rounded-xl",
      "bg-gradient-to-r from-primary/10 to-[hsl(var(--domain-community-accent))]/10",
      "border border-primary/20",
      "flex items-center gap-3",
      className
    )}>
      {/* Icon */}
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>

      {/* Text - single line on mobile */}
      <p className="flex-1 text-xs text-foreground leading-tight">
        Polish your bio, archetype & showcase
      </p>

      {/* Try button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onTry}
        className="h-7 px-3 text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary shrink-0"
      >
        Try
      </Button>
    </div>
  );
}
