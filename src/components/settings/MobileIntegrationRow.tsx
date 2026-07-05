import { CheckCircle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import type { Integration } from "./integrationData";

interface MobileIntegrationRowProps {
  integration: Integration;
  onTap: () => void;
}

export function MobileIntegrationRow({ integration, onTap }: MobileIntegrationRowProps) {
  const { translate } = useTranslation();
  const Icon = integration.icon;

  return (
    <div
      onClick={onTap}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98]",
        "bg-card/60 border border-border/50",
        integration.connected && "border-l-2 border-l-emerald-500"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
          integration.connected ? "bg-emerald-500/10" : "bg-muted/50"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm truncate">{integration.name}</h3>
        <p className="text-xs text-muted-foreground truncate">
          {integration.statusLabel
            ? integration.statusLabel
            : integration.connected
              ? translate('connectedApps.status.connected')
              : integration.comingSoon
                ? translate('connectedApps.status.comingSoon')
                : integration.syncData}
        </p>
      </div>

      {/* Status/Action */}
      <div className="shrink-0">
        {integration.connected ? (
          <CheckCircle className="h-5 w-5 text-emerald-500" />
        ) : integration.comingSoon ? (
          <Badge variant="secondary" className="text-xs">
            {translate('connectedApps.status.soon')}
          </Badge>
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
