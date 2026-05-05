/**
 * Overview > Activity — live OASIS event stream filtered by tenant
 */

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOverviewActivity } from "@/hooks/useAdminOverview";
import { t } from '@/lib/i18n-toast';

export default function OverviewActivity() {
  const activityQuery = useOverviewActivity(100);
  const events = activityQuery.data || [];

  return (
    <AppLayout>
      <AdminTabs sectionKey="overview" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="📡"
          title={t('screens.admin.activity')}
          description="Recent OASIS events for your tenant"
          rightAction={
            <Button variant="outline" size="sm" onClick={() => activityQuery.refetch()} disabled={activityQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${activityQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />

        {activityQuery.isLoading && <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingEvents')}</p>}

        {!activityQuery.isLoading && events.length === 0 && (
          <AdminEmptyState title={t('screens.admin.noRecentEvents')} description="OASIS events for your tenant will appear here as they occur." />
        )}

        {events.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>VTID</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {new Date(e.created_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="text-sm">{e.topic}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{e.vtid || "—"}</TableCell>
                    <TableCell>
                      <AdminStatusBadge variant={e.status === "error" || e.status === "critical" ? "error" : e.status === "warning" ? "warning" : "active"}>
                        {e.status}
                      </AdminStatusBadge>
                    </TableCell>
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
