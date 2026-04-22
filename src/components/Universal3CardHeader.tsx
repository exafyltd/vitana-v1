import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Plane } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useVitanaIndex } from "@/hooks/useVitanaIndex";

interface Universal3CardHeaderProps {
  title: string;
  description: string;
  emoji?: string;
  badgeText?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  onAutopilotClick?: () => void;
}

export function Universal3CardHeader({
  title,
  description,
  emoji,
  badgeText,
  badgeVariant = "outline",
  onAutopilotClick
}: Universal3CardHeaderProps) {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const { index: vitanaIndex, isLoading: vitanaIndexLoading } = useVitanaIndex();
  const vitanaIndexDisplay = vitanaIndexLoading || !vitanaIndex ? "…" : vitanaIndex.total.toString();
  const [showPreview, setShowPreview] = useState(false);
  
  const latestActions = getLatestActions(2);

  const handleAutopilotClick = () => {
    if (onAutopilotClick) {
      onAutopilotClick();
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="max-w-7xl mx-auto">
        {/* Header Section with Perfect Symmetry - Three Cards Layout */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Personalized Welcome Message */}
          <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{title} {emoji}</h1>
                {badgeText && (
                  <Badge variant={badgeVariant}>{badgeText}</Badge>
                )}
              </div>
              <p className="text-muted-foreground">{description}</p>
            </div>
          </div>
          
          {/* Autopilot Card with Live Badge Counter */}
          <div 
            className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl relative"
            onClick={handleAutopilotClick}
            onMouseEnter={() => setShowPreview(true)}
            onMouseLeave={() => setShowPreview(false)}
          >
            {pendingCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs animate-pulse z-10"
              >
                {pendingCount}
              </Badge>
            )}
            <div className="flex flex-col items-center justify-center h-full space-y-3">
              <div>
                <Plane className="w-10 h-10 text-red-400 transform rotate-0" />
              </div>
              <span className="text-sm font-medium text-red-400">Autopilot</span>
            </div>
            
            {/* Hover Preview */}
            {showPreview && pendingCount > 0 && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl p-3 z-10">
                <div className="text-xs font-medium text-muted-foreground mb-2">Latest Actions:</div>
                {latestActions.map((action, index) => (
                  <div key={action.id} className="flex items-center space-x-2 text-xs py-1">
                    <span>{action.icon}</span>
                    <span className="truncate">{action.title}</span>
                  </div>
                ))}
                {pendingCount > 2 && (
                  <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
                    +{pendingCount - 2} more actions
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Vitana Index Card */}
          <div
            className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
            onClick={() => navigate('/health/vitana-index')}
            role="button"
            aria-label={`Vitana Index: ${vitanaIndexDisplay}. Tap for details.`}
          >
            <div className="flex items-center justify-center h-full">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                <span className="text-xl font-bold text-green-600">{vitanaIndexDisplay}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}