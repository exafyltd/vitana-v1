/**
 * Audit & Compliance > Access Log — auth events and access records
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccessLog } from "@/hooks/useAdminAudit";
import { t } from '@/lib/i18n-toast';

export default function AuditAccess() {
  const query = useAccessLog(100);
  const entries = query.data || [];

  return (
    <AppLayout>
      <AdminTabs sectionKey="audit" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🔐"
          title={t('screens.admin.accessLog')}
          description="Authentication events and access records for your tenant"
        />

        {query.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingAccessLog')}</p>
        )}

        {!query.isLoading && entries.length === 0 && (
          <AdminEmptyState title={t('screens.admin.noAccessLogEntries')} description="Authentication and access events will appear here as they occur." />
        )}

        {entries.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('screens.admin.time')}</TableHead>
                  <TableHead>{t('screens.admin.topic')}</TableHead>
                  <TableHead>{t('screens.admin.status')}</TableHead>
                  <TableHead>{t('screens.admin.vtid')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">{e.topic}</TableCell>
                    <TableCell>
                      <AdminStatusBadge
                        variant={
                          e.status === "error" || e.status === "critical" ? "error" :
                          e.status === "warning" ? "warning" : "active"
                        }
                      >
                        {e.status}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{e.vtid || "—"}</TableCell>
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
