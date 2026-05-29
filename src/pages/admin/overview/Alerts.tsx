/**
 * Overview > Alerts — L1/L2 severity OASIS events for tenant (last 24h)
 */

import { RefreshCw, AlertTriangle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOverviewAlerts } from "@/hooks/useAdminOverview";
import { t } from '@/lib/i18n-toast';

import { fmtDateTime } from '@/lib/locale-format';
export default function OverviewAlerts() {
  const alertsQuery = useOverviewAlerts();
  const alerts = alertsQuery.data || [];

  return (
    <AppLayout>
      <AdminTabs sectionKey="overview" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🚨"
          title={t('screens.admin.alerts')}
          description="Critical and error-level events in the last 24 hours"
          rightAction={
            <Button variant="outline" size="sm" onClick={() => alertsQuery.refetch()} disabled={alertsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${alertsQuery.isFetching ? "animate-spin" : ""}`} />
              {t('screens.admin.refresh')}
            </Button>
          }
        />

        {alertsQuery.isLoading && <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingAlerts')}</p>}

        {!alertsQuery.isLoading && alerts.length === 0 && (
          <AdminEmptyState
            title={t('screens.admin.noAlertsAllClear')}
            description="No critical or error events detected in the last 24 hours."
          />
        )}

        {alerts.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]" />
                  <TableHead>{t('screens.admin.time')}</TableHead>
                  <TableHead>{t('screens.admin.topic')}</TableHead>
                  <TableHead>{t('screens.admin.status')}</TableHead>
                  <TableHead>{t('screens.admin.vtid')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell><AlertTriangle className="h-4 w-4 text-destructive" /></TableCell>
                    <TableCell className="text-xs font-mono whitespace-nowrap">
                      {fmtDateTime(new Date(a.created_at))}
                    </TableCell>
                    <TableCell className="text-sm">{a.topic}</TableCell>
                    <TableCell>
                      <AdminStatusBadge variant="error">{a.status}</AdminStatusBadge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{a.vtid || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
