import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MemoryCategoryCardProps {
  title: string;
  icon: LucideIcon;
  progress: number;
  memoryCount: number;
  insight: string;
  gradient: string;
  onClick: () => void;
}

export function MemoryCategoryCard({
  title,
  icon: Icon,
  progress,
  memoryCount,
  insight,
  gradient,
  onClick,
}: MemoryCategoryCardProps) {
  const circumference = 2 * Math.PI * 36; // radius = 36
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-300",
        "hover:shadow-lg hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <div className={cn("absolute inset-0 opacity-10", gradient)} />

      <CardContent className="p-6 relative">
        <div className="flex items-start gap-4">
          {/* Progress Ring */}
          <div className="relative flex-shrink-0">
            <svg className="w-20 h-20 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-muted"
                opacity="0.2"
              />
              {/* Progress circle */}
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="text-primary transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="h-6 w-6" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-semibold text-base mb-1 truncate">{title}</h3>
            <p className="text-xs text-muted-foreground mb-2">
              {memoryCount} {memoryCount === 1 ? "memory" : "memories"} · {progress}%
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {insight}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
