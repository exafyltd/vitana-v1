import { Wifi, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminAuditNavigation } from "@/config/navigation";
import { useQuery } from "@tanstack/react-query";
import { t } from '@/lib/i18n-toast';

const SERVICES = [
  { name: "Gateway", url: "https://gateway-86804897789.us-central1.run.app/alive" },
];

interface ServiceStatus {
  name: string;
  url: string;
  status: "healthy" | "unhealthy" | "checking";
  responseTime?: number;
  data?: any;
  error?: string;
}

export default function AuditApiMonitor() {
  const { data: statuses, isLoading } = useQuery({
    queryKey: ["admin-api-health"],
    queryFn: async () => {
      const results: ServiceStatus[] = [];
      for (const svc of SERVICES) {
        const start = Date.now();
        try {
          const res = await fetch(svc.url);
          const elapsed = Date.now() - start;
          if (res.ok) {
            const json = await res.json().catch(() => null);
            results.push({ ...svc, status: "healthy", responseTime: elapsed, data: json });
          } else {
            results.push({ ...svc, status: "unhealthy", responseTime: elapsed, error: `HTTP ${res.status}` });
          }
        } catch (err: any) {
          results.push({ ...svc, status: "unhealthy", responseTime: Date.now() - start, error: err.message });
        }
      }
      return results;
    },
    refetchInterval: 30000,
  });

  const services = statuses || SERVICES.map((s) => ({ ...s, status: "checking" as const }));
  const healthy = services.filter((s) => s.status === "healthy").length;
  const unhealthy = services.filter((s) => s.status === "unhealthy").length;

  return (
    <AppLayout>
      <SubNavigation items={adminAuditNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader
          title={t('screens.admin.apiMonitor')}
          description="Real-time health status of platform services"
          rightAction={
            <Badge variant={unhealthy > 0 ? "destructive" : "default"} className="text-sm px-3 py-1">
              {unhealthy > 0 ? `${unhealthy} Unhealthy` : "All Healthy"}
            </Badge>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? SERVICES.map((svc) => (
                <Card key={svc.name} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{svc.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-6 w-20 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))
            : services.map((svc) => (
                <Card key={svc.name} className={svc.status === "unhealthy" ? "border-destructive/50" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {svc.status === "healthy" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : svc.status === "unhealthy" ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground animate-spin" />
                      )}
                      {svc.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('screens.admin.status')}</span>
                      <Badge variant={svc.status === "healthy" ? "default" : "destructive"}>
                        {svc.status}
                      </Badge>
                    </div>
                    {svc.responseTime != null && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('screens.admin.responseTime')}</span>
                        <span className="font-mono text-xs">{t('screens.admin.responsetimeMs', { responseTime: svc.responseTime })}</span>
                      </div>
                    )}
                    {svc.data?.timestamp && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('screens.admin.timestamp')}</span>
                        <span className="text-xs">{new Date(svc.data.timestamp).toLocaleTimeString()}</span>
                      </div>
                    )}
                    {svc.error && (
                      <p className="text-xs text-destructive">{svc.error}</p>
                    )}
                    <p className="text-xs text-muted-foreground font-mono break-all">{svc.url}</p>
                  </CardContent>
                </Card>
              ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {t('screens.admin.autorefreshesEvery30SecondsAdditionalServices')}
        </p>
      </div>
    </AppLayout>
  );
}
