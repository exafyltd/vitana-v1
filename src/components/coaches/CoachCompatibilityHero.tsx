import { useState, useEffect } from "react";
import { TrendingUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { t } from '@/lib/i18n-toast';

interface CoachCompatibilityHeroProps {
  overallScore: number;
  topFactors: string[];
  sharedInterests: string[];
}

export function CoachCompatibilityHero({ 
  overallScore, 
  topFactors, 
  sharedInterests 
}: CoachCompatibilityHeroProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const duration = 1000;
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

  const circumference = 2 * Math.PI * 70;
  const offset = circumference * (1 - animatedScore / 100);

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-pink-50/80 via-fuchsia-50/80 to-amber-50/80 dark:from-pink-950/30 dark:via-fuchsia-950/30 dark:to-amber-950/30 backdrop-blur-xl border border-white/20 shadow-[0_0_40px_rgba(236,72,153,0.15)]">
      {/* Decorative glow effects */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
        {/* Left: Circular Gauge */}
        <div className="flex-shrink-0">
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle 
                cx="80" 
                cy="80" 
                r="70" 
                className="stroke-muted/30" 
                strokeWidth="10" 
                fill="none" 
              />
              <circle 
                cx="80" 
                cy="80" 
                r="70" 
                className="stroke-pink-500"
                strokeWidth="10" 
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ 
                  transition: 'stroke-dashoffset 0.5s ease-out',
                  filter: 'drop-shadow(0 0 12px rgba(236, 72, 153, 0.6))'
                }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
                {animatedScore}%
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-3">
            Overall Compatibility
          </p>
        </div>
        
        {/* Right: Factors & Interests */}
        <div className="flex-1 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-fuchsia-500/20">
                <TrendingUp className="w-5 h-5 text-pink-600" />
              </div>
              <h3 className="text-lg font-semibold">{t('screens.coaches.topMatchFactors')}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {topFactors.map((factor, index) => (
                <Badge 
                  key={index}
                  variant="outline" 
                  className="px-4 py-1.5 bg-gradient-to-r from-pink-500/10 to-fuchsia-500/10 border-pink-500/20 text-foreground backdrop-blur-sm"
                >
                  {factor}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-fuchsia-500/20 to-amber-500/20">
                <Zap className="w-5 h-5 text-fuchsia-600" />
              </div>
              <h3 className="text-lg font-semibold">{t('screens.coaches.sharedInterests')}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {sharedInterests.map((interest, index) => (
                <Badge 
                  key={index}
                  variant="outline" 
                  className="px-4 py-1.5 bg-gradient-to-r from-fuchsia-500/10 to-amber-500/10 border-fuchsia-500/20 text-foreground backdrop-blur-sm"
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
