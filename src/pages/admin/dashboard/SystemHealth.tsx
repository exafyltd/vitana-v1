import { Server, Activity, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminDashboardNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';

interface ServiceCardProps {
  name: string;
  description: string;
  healthy: boolean;
}

function ServiceCard({ name, description, healthy }: ServiceCardProps) {
  return (
    <Card
      className={`overflow-hidden border-l-4 transition-all hover:shadow-md ${
        healthy ? "border-l-green-500" : "border-l-red-500"
      }`}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{name}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {healthy ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              healthy ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
          />
          <span
            className={`text-sm font-medium ${
              healthy ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {healthy ? "Healthy" : "Unreachable"}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Check <code className="rounded bg-muted px-1 py-0.5">{t('screens.admin.alive')}</code> endpoint
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
  return (
    <AppLayout>
      <SubNavigation items={adminDashboardNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
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
              Cloud Run Services
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
                  <p className="text-sm text-muted-foreground mt-1">
                    This page shows placeholder service statuses. Real-time health checks require
                    server-side proxying through the Gateway to curl each service's{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">{t('screens.admin.alive')}</code> endpoint.
                    All services run on Cloud Run in{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">{t('screens.admin.uscentral1')}</code>{" "}
                    under project{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      lovable-vitana-vers1
                    </code>
                    .
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
