import { Badge } from "@/components/ui/badge";
import { Plane } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface StandardHeaderProps {
  title: string;
  description: string;
  emoji?: string;
  className?: string;
}

/**
 * Standard 3-card header pattern for all major pages
 * Ensures consistent Welcome + Autopilot + Vitana Index layout
 */
export default function StandardHeader({ title, description, emoji, className = "" }: StandardHeaderProps) {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const latestActions = getLatestActions(2);

  return (
    <>
      {/* Left-anchored header with grid layout */}
      <div className={`w-full rounded-2xl bg-white/70 ring-1 ring-black/5 backdrop-blur p-5 shadow-sm ${className}`}>
        <div className="grid grid-cols-12 gap-6 items-stretch">
          {/* Main message section - left anchored */}
          <div className="col-span-12 lg:col-span-8 2xl:col-span-9 text-left">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {title} {emoji}
            </h1>
            <p className="mt-1 text-muted-foreground">{description}</p>
          </div>
          
          {/* Autopilot Card */}
          <div className="col-span-6 sm:col-span-4 lg:col-span-2">
            <div 
              className="h-full bg-card rounded-xl p-4 shadow-sm border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-md relative"
              onClick={() => setAutopilotOpen(true)}
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
              <div className="flex flex-col items-center justify-center h-full space-y-2">
                <Plane className="w-8 h-8 text-destructive" />
                <span className="text-xs font-medium text-destructive">Autopilot</span>
              </div>
              
              {/* Hover Preview */}
              {showPreview && pendingCount > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-card border rounded-lg shadow-xl p-3 z-10">
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
          </div>
          
          {/* Vitana Index Card */}
          <div className="col-span-6 sm:col-span-4 lg:col-span-2">
            <div 
              className="h-full bg-card rounded-xl p-4 shadow-sm border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-md"
              onClick={() => navigate('/health/my-health-tracker')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-sm shadow-green-500/10 group-hover:shadow-green-500/20 transition-all duration-300">
                  <span className="text-lg font-bold text-primary">742</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
    </>
  );
}