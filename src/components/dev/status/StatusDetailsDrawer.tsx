import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notify, t } from '@/lib/i18n-toast';

interface ServiceStatus {
  name: string;
  status: "UP" | "DOWN";
  lastCode?: number;
  lastTime?: string;
}

interface ConnectionEvent {
  timestamp: string;
  type: "connected" | "retry" | "error";
  message: string;
}

interface StatusDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  services: ServiceStatus[];
  connectionEvents: ConnectionEvent[];
  diagnosticInfo: {
    eventsUrl: string;
    operatorUrl: string;
    sseUrl: string;
    origin: string;
    allowOrigin: string;
    userId?: string;
  };
  onRetryAll: () => void;
}

export function StatusDetailsDrawer({
  open,
  onClose,
  services,
  connectionEvents,
  diagnosticInfo,
  onRetryAll
}: StatusDetailsDrawerProps) {
  const copyDiagnostics = () => {
    const text = `
Command Hub Diagnostics
========================
Events API: ${diagnosticInfo.eventsUrl}
Operator API: ${diagnosticInfo.operatorUrl}
SSE Stream: ${diagnosticInfo.sseUrl}
Origin: ${diagnosticInfo.origin}
Allowed Origin: ${diagnosticInfo.allowOrigin}
User ID: ${diagnosticInfo.userId || "N/A"}

Service Status:
${services.map(s => `- ${s.name}: ${s.status} ${s.lastCode ? `(${s.lastCode})` : ""}`).join("\n")}

Recent Events:
${connectionEvents.slice(0, 10).map(e => `[${e.timestamp}] ${e.type}: ${e.message}`).join("\n")}
    `.trim();

    navigator.clipboard.writeText(text);
    notify('toasts.dev.diagnosticsCopiedClipboard');
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>{t('screens.dev.systemStatusDetails')}</SheetTitle>
          <SheetDescription>
            {t('screens.dev.realtimeBackendConnectivityDiagnosticInformation')}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-150px)] mt-6">
          <div className="space-y-6">
            {/* Service Matrix */}
            <div>
              <h3 className="font-semibold text-sm mb-3">{t('screens.dev.serviceStatus')}</h3>
              <div className="space-y-2">
                {services.map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {service.status === "UP" ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{service.name}</div>
                        {service.lastCode && (
                          <div className="text-xs text-muted-foreground">{t('screens.dev.statusLastcode', { lastCode: service.lastCode })}</div>
                        )}
                      </div>
                    </div>
                    <Badge variant={service.status === "UP" ? "success" : "destructive"}>
                      {service.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Connection Timeline */}
            <div>
              <h3 className="font-semibold text-sm mb-3">{t('screens.dev.connectionTimeline')}</h3>
              <div className="space-y-2">
                {connectionEvents.slice(0, 10).map((event, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Badge 
                      variant={
                        event.type === "connected" ? "success" :
                        event.type === "error" ? "destructive" :
                        "outline"
                      }
                      className="text-[10px] px-1.5 py-0 mt-0.5"
                    >
                      {event.type}
                    </Badge>
                    <div className="flex-1">
                      <div className="text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-foreground">{event.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Advanced Diagnostics */}
            <div>
              <h3 className="font-semibold text-sm mb-3">{t('screens.dev.diagnosticInfo')}</h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-muted/50 rounded border font-mono break-all">
                  <div className="mb-2">
                    <span className="text-muted-foreground">{t('screens.dev.eventsApi')}</span>
                    <div className="text-foreground">{diagnosticInfo.eventsUrl}</div>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted-foreground">{t('screens.dev.operatorApi')}</span>
                    <div className="text-foreground">{diagnosticInfo.operatorUrl}</div>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted-foreground">{t('screens.dev.sseStream')}</span>
                    <div className="text-foreground">{diagnosticInfo.sseUrl}</div>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted-foreground">{t('screens.dev.origin')}</span>
                    <div className="text-foreground">{diagnosticInfo.origin}</div>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted-foreground">{t('screens.dev.allowedOrigin')}</span>
                    <div className="text-foreground">{diagnosticInfo.allowOrigin || "N/A"}</div>
                  </div>
                  {diagnosticInfo.userId && (
                    <div>
                      <span className="text-muted-foreground">{t('screens.dev.userId')}</span>
                      <div className="text-foreground">{diagnosticInfo.userId}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onRetryAll}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('screens.dev.retryAllConnections')}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={copyDiagnostics}
              >
                <Copy className="w-4 h-4 mr-2" />
                {t('screens.dev.copyDiagnosticInfo')}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <a
                  href="https://docs.lovable.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t('screens.dev.openDocumentation')}
                </a>
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
