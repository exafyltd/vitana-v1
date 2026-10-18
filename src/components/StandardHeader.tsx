import { Badge } from "@/components/ui/badge";
import { Plane } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVitanaIndex } from "@/hooks/useVitanaIndex";
import { t } from '@/lib/i18n-toast';

interface StandardHeaderProps {
  title: string;
  description: string;
  emoji?: string;
  syncTimestamp?: string | null;
  className?: string;
  /**
   * VTID-05105 — 'compact' is the Spotlight desktop variant (64 px tall, same
   * emoji/title/description and the same Autopilot + Vitana Index tiles).
   * Default keeps today's large desktop header unchanged. Mobile ignores it.
   */
  density?: 'default' | 'compact';
}

/**
 * Standard 3-card header pattern for all major pages
 * Ensures consistent Welcome + Autopilot + Vitana Index layout
 */
export default function StandardHeader({ title, description, emoji, syncTimestamp, className, density = 'default' }: StandardHeaderProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { pendingCount, getLatestActions } = useAutopilot();
  const { index: vitanaIndex, isLoading: vitanaIndexLoading } = useVitanaIndex();
  const vitanaIndexDisplay = vitanaIndexLoading || !vitanaIndex ? "…" : vitanaIndex.total.toString();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const latestActions = getLatestActions(2);

  // Beautified mobile header - premium, consistent pattern
  if (isMobile) {
    return (
      <div className={cn("pt-1 pb-0", className)}>
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          {title}
        </h1>
      </div>
    );
  }

  if (density === 'compact') {
    return (
      <>
        <div className={cn("flex items-stretch gap-3", className)} data-header-density="compact">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border bg-card/85 px-5 py-3 shadow-sm backdrop-blur-sm">
            {emoji && <span className="text-xl leading-none" aria-hidden="true">{emoji}</span>}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold text-foreground">{title}</h1>
              <p className="truncate text-xs text-muted-foreground">{description}</p>
            </div>
            {syncTimestamp && <p className="shrink-0 text-xs text-muted-foreground">{syncTimestamp}</p>}
          </div>
          <button
            type="button"
            className="relative flex w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md"
            onClick={() => setAutopilotOpen(true)}
          >
            {pendingCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -end-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
              >
                {pendingCount}
              </Badge>
            )}
            <Plane className="h-6 w-6 text-destructive" aria-hidden="true" />
            <span className="text-xs font-semibold text-destructive">{t('screens.common.autopilot')}</span>
          </button>
          <button
            type="button"
            className="flex w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md"
            onClick={() => navigate('/health/vitana-index')}
            aria-label={t('spotlight.header.vitanaIndexAria', { value: vitanaIndexDisplay })}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-status-success/30 to-status-info/30 text-sm font-bold text-primary">
              {vitanaIndexDisplay}
            </span>
            <span className="text-xs text-muted-foreground">{t('spotlight.header.vitanaIndexLabel')}</span>
          </button>
        </div>
        <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
      </>
    );
  }

  // Desktop: Full 3-card layout
  return (
    <>
      {/* Header Section with Perfect Symmetry - Three Cards Layout */}
      <div className={cn("flex flex-col lg:flex-row gap-4 mb-8", className)}>
        {/* Welcome Message */}
        <div className="flex-1 bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-border/20">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {title} {emoji}
            </h1>
            <p className="text-muted-foreground">{description}</p>
            {syncTimestamp && (
              <p className="text-[10px] text-muted-foreground/80 absolute bottom-2 end-3">
                {syncTimestamp}
              </p>
            )}
          </div>
        </div>
        
        {/* Autopilot Card with Live Badge Counter */}
        <div 
          className="w-32 bg-card rounded-2xl p-6 shadow-xl border border-border/20 cursor-pointer group transition-all duration-300 hover:shadow-2xl relative z-10"
          onClick={() => setAutopilotOpen(true)}
          onMouseEnter={() => setShowPreview(true)}
          onMouseLeave={() => setShowPreview(false)}
        >
          {pendingCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -end-2 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs animate-pulse z-10"
            >
              {pendingCount}
            </Badge>
          )}
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <div>
              <Plane className="w-10 h-10 text-destructive transform rotate-0" />
            </div>
            <span className="text-sm font-medium text-destructive">{t('screens.common.autopilot')}</span>
          </div>
          
          {/* Hover Preview */}
          {showPreview && pendingCount > 0 && (
            <div className="absolute top-full start-0 mt-2 w-64 bg-card border rounded-lg shadow-xl p-3 z-10">
              <div className="text-xs font-medium text-muted-foreground mb-2">{t('screens.common.latestActions')}</div>
              {latestActions.map((action, index) => (
                <div key={action.id} className="flex items-center space-x-2 text-xs py-1">
                  <span>{action.icon}</span>
                  <span className="truncate">{action.title}</span>
                </div>
              ))}
              {pendingCount > 2 && (
                <div className="text-xs text-muted-foreground pt-1 border-t mt-1">{t('screens.common.value0MoreActions', { value0: pendingCount - 2 })}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Vitana Index Card */}
        <div
          className="w-32 bg-card rounded-2xl p-6 shadow-xl border border-border/20 cursor-pointer group transition-all duration-300 hover:shadow-2xl relative z-10"
          onClick={() => navigate('/health/vitana-index')}
          role="button"
          aria-label={`Vitana Index: ${vitanaIndexDisplay}. Tap for details.`}
        >
          <div className="flex items-center justify-center h-full">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-status-success/30 to-status-info/30 flex items-center justify-center shadow-lg shadow-status-success/20 group-hover:shadow-status-success/40 transition-all duration-300">
              <span className="text-xl font-bold text-primary">{vitanaIndexDisplay}</span>
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