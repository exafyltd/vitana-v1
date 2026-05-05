import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Plane, Lock } from "lucide-react";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";
import { useDevAutopilot } from "@/hooks/use-dev-autopilot";
import { DevAutopilotPopup } from "@/components/dev/DevAutopilotPopup";
import { t } from '@/lib/i18n-toast';

interface DevStandardHeaderProps {
  title: string;
  description: string;
  emoji?: string;
}

/**
 * Dev Hub specific 3-card header following VITANA Universal Design Pattern
 * Structure: Welcome Card + Autopilot Card + Vitana Index Card
 */
export function DevStandardHeader({ title, description, emoji }: DevStandardHeaderProps) {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useDevAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const latestActions = getLatestActions(2);

  return (
    <div className="space-y-4">
      {/* Read-Only Banner (if applicable) */}
      {DEV_HUB_CONFIG.readonly && (
        <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
          <Lock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-300">{t('screens.dev.readonlyMode2')}</AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-400">
            Phase 1: View-only access. Write operations available in Phase 2.
          </AlertDescription>
        </Alert>
      )}

      {/* 3-Card Header */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Card - Welcome Message */}
        <div className="flex-1 bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {title} {emoji}
            </h1>
            <p className="text-muted-foreground">{description}</p>
            {DEV_HUB_CONFIG.readonly && (
              <Badge variant="secondary" className="mt-2">
                Read-Only
              </Badge>
            )}
          </div>
        </div>

        {/* Middle Card - Autopilot Widget */}
        <div 
          className="w-32 bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl relative"
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
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <div>
              <Plane className="w-10 h-10 text-red-400 transform rotate-0" />
            </div>
            <span className="text-sm font-medium text-red-400">Autopilot</span>
          </div>

          {/* Hover Preview */}
          {showPreview && pendingCount > 0 && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 dark:bg-card/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl p-3 z-10">
              <div className="text-xs font-medium text-muted-foreground mb-2">{t('screens.dev.latestActions')}</div>
              {latestActions.map((action) => (
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

        {/* Right Card - System Health */}
        <div 
          className="w-32 bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
          onClick={() => navigate('/dev/observability/health')}
        >
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            <span className="text-3xl font-bold" style={{ color: '#22c55e' }}>
              99%
            </span>
            <span className="text-xs text-muted-foreground">{t('screens.dev.systemHealth')}</span>
          </div>
        </div>
      </div>

      {/* Dev Autopilot Popup */}
      <DevAutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
    </div>
  );
}
