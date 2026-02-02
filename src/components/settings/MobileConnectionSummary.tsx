import { useTranslation } from "@/hooks/useTranslation";

interface MobileConnectionSummaryProps {
  connectedCount: number;
  syncingCount: number;
}

export function MobileConnectionSummary({
  connectedCount,
  syncingCount,
}: MobileConnectionSummaryProps) {
  const { translate } = useTranslation();

  return (
    <div className="flex items-center justify-between p-3 bg-card/80 rounded-xl border border-border/50">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-medium">
          {connectedCount} {translate('connectedApps.connected')}
        </span>
      </div>
      {syncingCount > 0 && (
        <span className="text-xs text-muted-foreground">
          {syncingCount} {translate('connectedApps.syncing')}
        </span>
      )}
    </div>
  );
}
