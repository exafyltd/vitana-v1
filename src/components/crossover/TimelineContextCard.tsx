import { CrossoverCard } from "./CrossoverCard";
import { Clock, Calendar, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";

interface TimelineContextCardProps {
  energyPeaks?: string[];
  focusTimes?: string[];
  restWindows?: string[];
  className?: string;
}

function TimelineContextCardBase({ 
  energyPeaks = ["10am", "3pm"],
  focusTimes = ["9-11am", "2-4pm"],
  restWindows = ["12-1pm", "6-7pm"],
  className 
}: TimelineContextCardProps) {
  const navigate = useNavigate();

  const content = (
    <div className="space-y-3">
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-yellow-600" />
          <span className="font-medium">Energy peaks:</span>
          <span className="text-muted-foreground">{energyPeaks.join(", ")}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-blue-600" />
          <span className="font-medium">Focus times:</span>
          <span className="text-muted-foreground">{focusTimes.join(", ")}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-purple-600" />
          <span className="font-medium">Rest windows:</span>
          <span className="text-muted-foreground">{restWindows.join(", ")}</span>
        </div>
      </div>

      <div className="mt-4 p-2 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Optimal for productivity</span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Clock}
      category="mental"
      title="Next 12 Hours ⏳"
      subtitle="Your optimal energy & focus timeline"
      content={content}
      buttonText="Use This Plan"
      onButtonClick={() => navigate('/calendar')}
      secondaryButtonText="Share Schedule"
      onSecondaryButtonClick={() => navigate('/sharing/packages')}
      className={className}
    />
  );
}

export const TimelineContextCard = withCardId(TimelineContextCardBase, "CT-CX-013", "C-013");