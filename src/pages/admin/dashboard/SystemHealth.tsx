import { Server, Activity, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminDashboardNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';
import { ScreenFrame } from '@/components/layout/spotlight';
import { useSpotlightEnabled } from '@/hooks/useSpotlightEnabled';

interface ServiceCardProps {
  name: string;
  description: string;
  healthy: boolean;
}

function ServiceCard({ name, description, healthy }: ServiceCardProps) {
  return (
    <Card
      className={`overflow-hidden border-s-4 transition-all hover:shadow-md ${
        healthy ? "border-s-status-success" : "border-s-status-error"
      }`}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{name}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {healthy ? (
            <Wifi className="h-4 w-4 text-status-success" />
          ) : (
            <WifiOff className="h-4 w-4 text-status-error" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              healthy ? "bg-status-success animate-pulse" : "bg-status-error"
            }`}
          />
          <span
            className={`text-sm font-medium ${
              healthy ? "text-status-success" : "text-status-error"
            }`}
          >
            {healthy ? "Healthy" : "Unreachable"}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t('screens.admin.check')} <code className="rounded bg-muted px-1 py-0.5">{t('screens.admin.alive')}</code>{t('screens.admin.endpoint')}
        </p>
      </CardContent>
    </Card>
  );
}

const services: ServiceCardProps[] = [
  {
    name: "Gateway",
    description: "API gateway and request routing",
    healthy: true,
  },
  {
    name: "OASIS Operator",
    description: "Task orchestration and lifecycle management",
    healthy: true,
  },
  {
    name: "OASIS Projector",
    description: "Event projection and read model updates",
    healthy: true,
  },
  {
    name: "Worker Runner",
    description: "Autonomous task execution plane",
    healthy: true,
  },
  {
    name: "Verification Engine",
    description: "Task validation and verification",
    healthy: true,
  },
];

export default function SystemHealth() {
  const spotlight = useSpotlightEnabled();
  const adminBody = (
    <>
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.systemHealth')}
            description="Monitor service status and infrastructure health"
            emoji="🏥"
          />

          {/* Service Status Grid */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Server className="h-5 w-5 text-muted-foreground" />
              {t('screens.admin.cloudRunServices')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <ServiceCard key={service.name} {...service} />
              ))}
            </div>
          </div>

          {/* Infrastructure Note */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('screens.admin.staticStatusDisplay')}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t('screens.admin.thisPageShowsPlaceholderServiceStatuses', { value0: " " })}<code className="rounded bg-muted px-1 py-0.5 text-xs">{t('screens.admin.alive')}</code>{t('screens.admin.endpointAllServicesRunCloudRun', { value0: " " })}<code className="rounded bg-muted px-1 py-0.5 text-xs">{t('screens.admin.uscentral1')}</code>{t('screens.admin.value0UnderProjectValue1', { value0: " ", value1: " " })}<code className="rounded bg-muted px-1 py-0.5 text-xs">
                      {t('screens.admin.lovablevitanavers1')}
                    </code>
                    .
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </>
  );

  return (
    <AppLayout>
      <SubNavigation items={adminDashboardNavigation} />
      {spotlight ? (
        <ScreenFrame archetype="workspace">
          {adminBody}
        </ScreenFrame>
      ) : (
        <div className="p-6 bg-gradient-to-br from-surface-page-from via-surface-raised to-surface-page-via min-h-screen">{adminBody}</div>
      )}
    </AppLayout>
  );
}
