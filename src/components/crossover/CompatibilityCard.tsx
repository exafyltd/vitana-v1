import { CrossoverCard } from "./CrossoverCard";
import { Target, TrendingUp, Zap, ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from "react";
import { notify } from '@/lib/i18n-toast';

interface CompatibilityCardProps {
  className?: string;
}

function CompatibilityCardBase({ className }: CompatibilityCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { insights } = useDemoMatches();
  const [animatedScore, setAnimatedScore] = useState(0);
  
  const overallScore = insights.compatibility_overall_pct;
  const topFactors = insights.top_factors;
  const matchingInterests = insights.shared_interests;
  const weekDelta = insights.week_delta_pct;

  useEffect(() => {
    // Animate score from 0 to target
    const duration = 1000; // 1 second
    const steps = 30;
    const increment = overallScore / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= overallScore) {
        setAnimatedScore(overallScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [overallScore]);

  const handleImproveScore = () => {
    notify('toasts.crossover.smartNudgesAdded', 'toasts.crossover.added2OptimizedActionsYourActions');
  };

  const content = (
    <div className="space-y-3">
      <div className="text-center p-4 bg-gradient-to-br from-pink-500/10 to-fuchsia-500/10 rounded-2xl border border-pink-500/20 backdrop-blur-md">
        <div className="relative inline-flex items-center justify-center">
          <svg className="w-32 h-32 transform -rotate-90 absolute">
            <circle 
              cx="64" 
              cy="64" 
              r="56" 
              className="stroke-muted/30" 
              strokeWidth="8" 
              fill="none" 
            />
            <circle 
              cx="64" 
              cy="64" 
              r="56" 
              className="stroke-pink-500"
              strokeWidth="8" 
              fill="none"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - animatedScore / 100)}`}
              style={{ 
                transition: 'stroke-dashoffset 0.3s ease-out',
                filter: 'drop-shadow(0 0 8px rgba(236, 72, 153, 0.5))'
              }}
            />
          </svg>
          <div className="relative z-10">
            <div className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
              {animatedScore}%
            </div>
            {weekDelta > 0 && (
              <div className="flex items-center justify-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                <ArrowUp className="w-3 h-3" />
                <span>+{weekDelta}% this week</span>
              </div>
            )}
          </div>
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
      onSecondaryButtonClick={handleImproveScore}
      className={className}
    />
  );
}

export const CompatibilityCard = withCardId(CompatibilityCardBase, "CT-CX-017", "C-017");