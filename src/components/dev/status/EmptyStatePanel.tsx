import { Button } from "@/components/ui/button";
import { AlertCircle, WifiOff, Filter, RefreshCw } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface EmptyStatePanelProps {
  type: "offline" | "degraded" | "quiet";
  onRetry?: () => void;
  onOpenDetails?: () => void;
  onClearFilters?: () => void;
  onForceReconnect?: () => void;
  onViewLogs?: () => void;
}

export function EmptyStatePanel({
  type,
  onRetry,
  onOpenDetails,
  onClearFilters,
  onForceReconnect,
  onViewLogs
}: EmptyStatePanelProps) {
  if (type === "offline") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <WifiOff className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">{t('screens.dev.noBackendConnection')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('screens.dev.commandsChatCurrentlyDisabledBackendService')}
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            {onRetry && (
              <Button onClick={onRetry} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('screens.dev.retryConnection')}
              </Button>
            )}
            {onOpenDetails && (
              <Button onClick={onOpenDetails} variant="outline" size="sm">
                {t('screens.dev.openStatusDetails')}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === "degraded") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">{t('screens.dev.streamingUnavailable')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('screens.dev.realtimeUpdatesDownFallingBackPolling')}
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            {onForceReconnect && (
              <Button onClick={onForceReconnect} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('screens.dev.forceReconnect')}
              </Button>
            )}
            {onViewLogs && (
              <Button onClick={onViewLogs} variant="outline" size="sm">
                {t('screens.dev.viewLogs')}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // type === "quiet"
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md p-6 space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Filter className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-2">{t('screens.dev.noEventsMatchFilters')}</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or wait for new events to arrive.
          </p>
        </div>
        {onClearFilters && (
          <Button onClick={onClearFilters} variant="outline" size="sm">
            {t('screens.dev.clearAllFilters')}
          </Button>
        )}
      </div>
    </div>
  );
}
