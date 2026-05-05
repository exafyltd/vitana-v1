import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useModerationReports } from "@/hooks/useAdminCommunity";
import { t } from '@/lib/i18n-toast';

export default function ReportedContentNew() {
  const { data: reports = [], isLoading } = useModerationReports();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = statusFilter === "all"
    ? reports
    : reports.filter((r) => r.status === statusFilter);

  return (
    <AppLayout>
      <AdminTabs sectionKey="community" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="🚩"
          title={t('screens.admin.reportedContent')}
          description="Review and resolve user-submitted content reports"
        />

        <div className="flex gap-2">
          {["all", "pending", "resolved", "dismissed"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t('screens.admin.loadingReports')}</p>
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            title={t('screens.admin.noReportsFound')}
            description="There are no content reports matching the current filter."
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('screens.admin.contentType')}</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="capitalize">{r.content_type}</TableCell>
                    <TableCell className="capitalize">{r.reason}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {r.reporter_user_id}
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge
                        variant={
                          r.status === "pending" ? "warning" :
                          r.status === "resolved" ? "active" :
                          "inactive"
                        }
                      >
                        {r.status}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
