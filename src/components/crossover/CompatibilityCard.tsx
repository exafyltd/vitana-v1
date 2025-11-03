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
      <div className="text-center p-4 bg-gradient-to-br from-pink-500/10 to-fuchsia-500/10 rounded-2xl border border-pink-500/20 backdrop-blur-md">
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-fuchsia-500 rounded-full opacity-20 animate-pulse" />
          <div className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-fuchsia-500 bg-clip-text text-transparent relative animate-pulse">{overallScore}%</div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Overall Compatibility</p>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <TrendingUp className="w-3 h-3 text-pink-600" />
          <span className="font-medium">Top Match Factors:</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {topFactors.map((factor, index) => (
            <span 
              key={index} 
              className="px-3 py-1.5 bg-gradient-to-r from-pink-500/10 to-fuchsia-500/10 border border-pink-500/20 text-foreground text-xs rounded-full backdrop-blur-sm"
            >
              {factor}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Zap className="w-3 h-3 text-fuchsia-600" />
          <span className="font-medium">Shared Interests:</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {matchingInterests.map((interest, index) => (
            <span 
              key={index} 
              className="px-3 py-1.5 bg-gradient-to-r from-fuchsia-500/10 to-amber-500/10 border border-fuchsia-500/20 text-foreground text-xs rounded-full backdrop-blur-sm"
            >
              {interest}
            </span>
          ))}
        </div>
      </div>

      <div className="w-full bg-secondary/30 rounded-full h-2.5 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-amber-500 h-2.5 rounded-full transition-all duration-1000 ease-out animate-pulse shadow-[0_0_10px_rgba(236,72,153,0.5)]" 
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