import { CrossoverCard } from "./CrossoverCard";
import { Target, TrendingUp, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";

interface CompatibilityCardProps {
  overallScore?: number;
  topFactors?: string[];
  matchingInterests?: string[];
  className?: string;
}

function CompatibilityCardBase({ 
  overallScore = 89,
  topFactors = ["Wellness Goals", "Activity Level", "Schedule Flexibility"],
  matchingInterests = ["Yoga", "Healthy Eating", "Mindfulness"],
  className 
}: CompatibilityCardProps) {
  const navigate = useNavigate();

  const content = (
    <div className="space-y-3">
      <div className="text-center p-3 bg-secondary/20 rounded-lg">
        <div className="text-2xl font-bold text-primary">{overallScore}%</div>
        <p className="text-xs text-muted-foreground">Overall Compatibility</p>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <TrendingUp className="w-3 h-3 text-green-600" />
          <span className="font-medium">Top Match Factors:</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {topFactors.map((factor, index) => (
            <span 
              key={index} 
              className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs rounded-full"
            >
              {factor}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Zap className="w-3 h-3 text-blue-600" />
          <span className="font-medium">Shared Interests:</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {matchingInterests.map((interest, index) => (
            <span 
              key={index} 
              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs rounded-full"
            >
              {interest}
            </span>
          ))}
        </div>
      </div>

      <div className="w-full bg-secondary/30 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all" 
          style={{ width: `${overallScore}%` }}
        />
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Target}
      category="mental"
      title="Match Analysis 🎯"
      subtitle="AI-powered compatibility insights"
      content={content}
      buttonText="View Details"
      onButtonClick={() => navigate('/ai/insights')}
      secondaryButtonText="Improve Score"
      onSecondaryButtonClick={() => navigate('/settings/preferences')}
      className={className}
    />
  );
}

export const CompatibilityCard = withCardId(CompatibilityCardBase, "CT-CX-017", "C-017");