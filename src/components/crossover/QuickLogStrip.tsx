import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QuickLogStripProps {
  className?: string;
}

const quickLogButtons = [
  { emoji: "🥤", label: "Drink", color: "bg-blue-100 hover:bg-blue-200 text-blue-700" },
  { emoji: "🍏", label: "Eat", color: "bg-green-100 hover:bg-green-200 text-green-700" },
  { emoji: "🏃", label: "Move", color: "bg-purple-100 hover:bg-purple-200 text-purple-700" },
  { emoji: "😴", label: "Sleep", color: "bg-indigo-100 hover:bg-indigo-200 text-indigo-700" },
  { emoji: "😊", label: "Mood", color: "bg-yellow-100 hover:bg-yellow-200 text-yellow-700" },
];

export function QuickLogStrip({ className }: QuickLogStripProps) {
  const handleQuickLog = (type: string) => {
    // In real implementation, this would open a quick logging modal
    console.log("Quick log:", type);
  };

  return (
    <Card className={cn(
      "bg-white/80 backdrop-blur-sm border-white/20 p-4",
      className
    )}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Quick Log</h3>
        <div className="flex gap-2">
          {quickLogButtons.map((button) => (
            <Button
              key={button.label}
              variant="ghost"
              size="sm"
              onClick={() => handleQuickLog(button.label)}
              className={cn(
                "h-10 w-10 p-0 rounded-full transition-all duration-200",
                button.color
              )}
            >
              <span className="text-lg">{button.emoji}</span>
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}