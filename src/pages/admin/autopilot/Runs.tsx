/**
 * Autopilot > Runs tab
 *
 * Execution history: every time an autopilot action ran for this tenant.
 * Filterable by status and automation.
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
import { useAutopilotRuns } from "@/hooks/useAdminAutopilot";
import { t } from '@/lib/i18n-toast';

const STATUS_VARIANT: Record<string, "active" | "warning" | "error" | "inactive" | "info"> = {
  running: "info",
  completed: "active",
  failed: "error",
  cancelled: "inactive",
};

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
}

export default function AutopilotRuns() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const runsQuery = useAutopilotRuns({
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 100,
  });

  const runs = runsQuery.data?.runs || [];

  const filtered = search
    ? runs.filter(r => r.automation_id.toLowerCase().includes(search.toLowerCase()))
    : runs;

  function handleReset() {
    setSearch("");
    setStatusFilter("all");
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="autopilot" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="📋"
          title={t('screens.admin.executionRuns')}
          description={`${runsQuery.data?.total || 0} total runs`}
        />

        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Filter by automation ID..."
          filters={[
            {
              value: statusFilter,
              onChange: setStatusFilter,
              placeholder: "All statuses",
              options: [
                { value: "all", label: "All statuses" },
                { value: "running", label: "Running" },
                { value: "completed", label: "Completed" },
                { value: "failed", label: "Failed" },
                { value: "cancelled", label: "Cancelled" },
              ],
            },
          ]}
          onReset={handleReset}
        />

        {runsQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingRuns')}</p>
        )}

        {runsQuery.isError && (
          <p className="text-sm text-destructive py-8 text-center">
            {(runsQuery.error as Error)?.message || "Failed to load runs"}
          </p>
        )}

        {!runsQuery.isLoading && filtered.length === 0 && (
          <AdminEmptyState
            title={t('screens.admin.noRunsYet')}
            description="Execution history will appear once automations start running."
          />
        )}

        {filtered.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Automation</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>VTID</TableHead>
                  <TableHead className="text-right">Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono text-sm">{run.automation_id}</TableCell>
                    <TableCell className="text-xs capitalize">{run.trigger_type}</TableCell>
                    <TableCell>
                      <AdminStatusBadge variant={STATUS_VARIANT[run.status] || "inactive"}>
                        {run.status}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{formatDuration(run.duration_ms)}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {run.activated_vtid || "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(run.started_at).toLocaleString()}
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
