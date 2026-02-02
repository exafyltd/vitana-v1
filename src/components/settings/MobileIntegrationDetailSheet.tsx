import { Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import type { Integration } from "./integrationData";

interface MobileIntegrationDetailSheetProps {
  integration: Integration | null;
  onClose: () => void;
}

export function MobileIntegrationDetailSheet({
  integration,
  onClose,
}: MobileIntegrationDetailSheetProps) {
  const { translate } = useTranslation();

  if (!integration) return null;

  const Icon = integration.icon;

  return (
    <Sheet open={!!integration} onOpenChange={() => onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader className="sr-only">
          <SheetTitle>{integration.name}</SheetTitle>
        </SheetHeader>
        
        <div className="flex items-center gap-3 mb-4">
          <div
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center shrink-0",
              integration.connected ? "bg-emerald-500/10" : "bg-muted"
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold">{integration.name}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {integration.connected
                ? `${translate('connectedApps.lastSync')}: ${integration.lastSync}`
                : translate('connectedApps.status.notConnected')}
            </p>
          </div>
        </div>

        {integration.connected ? (
          <>
            <div className="space-y-2 mb-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium">
                {translate('connectedApps.dataSync')}:
              </p>
              <p className="text-sm text-muted-foreground">
                {integration.syncData}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                {translate('connectedApps.actions.configure')}
              </Button>
              <Button variant="destructive" className="flex-1">
                {translate('connectedApps.actions.disconnect')}
              </Button>
            </div>
          </>
        ) : integration.comingSoon ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">
              {translate('connectedApps.comingSoonMessage').replace('{appName}', integration.name)}
            </p>
          </div>
        ) : (
          <Button className="w-full" size="lg">
            <Plus className="h-4 w-4 mr-2" />
            {translate('connectedApps.actions.connect')}
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}
