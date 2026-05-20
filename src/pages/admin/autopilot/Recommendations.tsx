/**
 * Autopilot > Recommendations tab
 *
 * Tenant-filtered view of AI-generated recommendations with status badges,
 * domain/risk filters, and impact/effort scores.
 */

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  useAutopilotRecommendations,
  useRecommendationsSummary,
} from "@/hooks/useAdminAutopilot";
import { t } from '@/lib/i18n-toast';

import { fmtDate } from '@/lib/locale-format';
const STATUS_VARIANT: Record<string, "active" | "warning" | "error" | "inactive" | "info"> = {
  new: "info",
  activated: "active",
  rejected: "error",
  snoozed: "warning",
};

const RISK_VARIANT: Record<string, "active" | "warning" | "error" | "inactive"> = {
  low: "active",
  medium: "warning",
  high: "error",
};

export default function AutopilotRecommendations() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");

  const recsQuery = useAutopilotRecommendations({
    status: statusFilter !== "all" ? statusFilter : undefined,
    domain: domainFilter !== "all" ? domainFilter : undefined,
  });
  const summaryQuery = useRecommendationsSummary();

  const recs = recsQuery.data?.recommendations || [];
  const summary = summaryQuery.data;

  const filtered = search
    ? recs.filter(r =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.summary.toLowerCase().includes(search.toLowerCase())
      )
    : recs;

  function handleReset() {
    setSearch("");
    setStatusFilter("all");
    setDomainFilter("all");
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="autopilot" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🤖"
          title={t('screens.admin.recommendations')}
          description={`${recsQuery.data?.total || 0} recommendations visible for your tenant`}
        />

        {summary && (
          <div className="flex flex-wrap gap-2">
            <AdminStatusBadge variant="info">{t('screens.admin.newNew', { new: summary.new })}</AdminStatusBadge>
            <AdminStatusBadge variant="active">{t('screens.admin.activatedActivated', { activated: summary.activated })}</AdminStatusBadge>
            <AdminStatusBadge variant="warning">{t('screens.admin.snoozedSnoozed', { snoozed: summary.snoozed })}</AdminStatusBadge>
            <AdminStatusBadge variant="error">{t('screens.admin.rejectedRejected', { rejected: summary.rejected })}</AdminStatusBadge>
          </div>
        )}

        {recsQuery.data && !recsQuery.data.autopilot_enabled && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-300">
            {t('screens.admin.autopilotCurrentlyDisabledForThisTenant')}
          </div>
        )}

        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search recommendations..."
          filters={[
            {
              value: statusFilter,
              onChange: setStatusFilter,
              placeholder: "All statuses",
              options: [
                { value: "all", label: "All statuses" },
                { value: "new", label: "New" },
                { value: "activated", label: "Activated" },
                { value: "snoozed", label: "Snoozed" },
                { value: "rejected", label: "Rejected" },
              ],
            },
            {
              value: domainFilter,
              onChange: setDomainFilter,
              placeholder: "All domains",
              options: [
                { value: "all", label: "All domains" },
                { value: "health", label: "Health" },
                { value: "community", label: "Community" },
                { value: "longevity", label: "Longevity" },
                { value: "professional", label: "Professional" },
                { value: "general", label: "General" },
              ],
            },
          ]}
          onReset={handleReset}
        />

        {recsQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingRecommendations')}</p>
        )}

        {recsQuery.isError && (
          <p className="text-sm text-destructive py-8 text-center">
            {(recsQuery.error as Error)?.message || "Failed to load recommendations"}
          </p>
        )}

        {!recsQuery.isLoading && filtered.length === 0 && (
          <AdminEmptyState
            title={t('screens.admin.noRecommendations')}
            description={search || statusFilter !== "all" ? "Try different filters." : "Recommendations will appear as the autopilot analyzes your community."}
          />
        )}

        {filtered.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('screens.admin.title')}</TableHead>
                  <TableHead>{t('screens.admin.domain')}</TableHead>
                  <TableHead>{t('screens.admin.risk')}</TableHead>
                  <TableHead className="text-center">{t('screens.admin.impact')}</TableHead>
                  <TableHead className="text-center">{t('screens.admin.effort')}</TableHead>
                  <TableHead>{t('screens.admin.status')}</TableHead>
                  <TableHead className="text-right">{t('screens.admin.created')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{r.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{r.summary}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs capitalize">{r.domain}</span>
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge variant={RISK_VARIANT[r.risk_level] || "inactive"}>
                        {r.risk_level}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">{r.impact_score}</TableCell>
                    <TableCell className="text-center font-mono text-sm">{r.effort_score}</TableCell>
                    <TableCell>
                      <AdminStatusBadge variant={STATUS_VARIANT[r.status] || "inactive"}>
                        {r.status}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {fmtDate(new Date(r.created_at))}
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
