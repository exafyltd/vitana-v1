import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevDataTable, DevDataColumn } from "@/components/dev/DevDataTable";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Filter, Clock, CheckCircle, XCircle } from "lucide-react";
import { devCommandNavigation } from "@/config/dev-navigation";
import { RestoreSessionButton } from "@/components/dev/RestoreSessionButton";
import { RestoreSessionModal } from "@/components/dev/modals/RestoreSessionModal";
import { useCICDStatus } from "@/hooks/dev/useCICDStatus";
import { useGovernance } from "@/hooks/dev/useGovernance";
import { CICDApproval } from "@/lib/devGatewayClient";
import { DevStatusGrid } from "@/components/dev/DevStatusGrid";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
};

const typeColors: Record<string, string> = {
  deploy: "bg-blue-100 text-blue-800",
  merge: "bg-purple-100 text-purple-800",
  rollback: "bg-orange-100 text-orange-800",
};

const approvalColumns: DevDataColumn<CICDApproval & Record<string, unknown>>[] = [
  {
    key: "vtid",
    label: "VTID",
    sortable: true,
    render: (row) => <Badge variant="secondary" className="text-xs font-mono">{row.vtid}</Badge>,
  },
  {
    key: "service",
    label: "Service",
    sortable: true,
    render: (row) => <span className="font-medium text-sm">{row.service}</span>,
  },
  {
    key: "type",
    label: "Type",
    sortable: true,
    render: (row) => <Badge className={`text-xs ${typeColors[row.type] || "bg-gray-100 text-gray-800"}`}>{row.type}</Badge>,
  },
  {
    key: "requestor",
    label: "Requestor",
    sortable: true,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (row) => <Badge className={`text-xs ${statusColors[row.status] || "bg-gray-100 text-gray-800"}`}>{row.status}</Badge>,
  },
  {
    key: "created_at",
    label: "Requested",
    sortable: true,
    render: (row) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
      </span>
    ),
  },
];

export default function CommandApprovals() {
  const [activeTab, setActiveTab] = useState("pending");
  const [restoreSessionOpen, setRestoreSessionOpen] = useState(false);
  const { approvals, pendingApprovals, error, available, isLoading, refetch } = useCICDStatus();
  const { governance } = useGovernance();

  const allApprovals = approvals.map(a => ({ ...a } as CICDApproval & Record<string, unknown>));
  const pendingOnly = allApprovals.filter(a => a.status === "pending");
  const historyOnly = allApprovals.filter(a => a.status !== "pending");

  return (
    <>
      <SEO
        title="Vitana DEV — Command Approvals"
        description="Review and approve commands requiring authorization"
        canonical={window.location.href}
      />

      <SubNavigation items={devCommandNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <DevStandardHeader
            title="Command Approvals"
            description="Review and approve commands requiring authorization"
            emoji="✅"
          />

          <UtilityActionButton
            trailingElement={<RestoreSessionButton onClick={() => setRestoreSessionOpen(true)} />}
          >
            <ExpandableSearchButton
              placeholder="Search approvals…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => refetch()}>
              <Filter className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={3}>
            <DevMetricsCard title="Pending" value={pendingApprovals} icon={Clock} variant={pendingApprovals > 0 ? "warning" : "default"} />
            <DevMetricsCard title="Approved" value={historyOnly.filter(a => a.status === "approved").length} icon={CheckCircle} variant="success" />
            <DevMetricsCard title="Denied" value={historyOnly.filter(a => a.status === "denied").length} icon={XCircle} variant="danger" />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="pending">Pending ({pendingOnly.length})</SplitBarTrigger>
              <SplitBarTrigger value="history">History</SplitBarTrigger>
              <SplitBarTrigger value="policies">Policies</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="pending" className="mt-6">
              <DevDataTable
                title="Pending Approvals"
                description="Commands awaiting authorization before execution"
                columns={approvalColumns}
                data={pendingOnly}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                searchable
                searchPlaceholder="Filter pending approvals…"
                searchKeys={["vtid", "service", "type", "requestor"]}
                emptyMessage="No pending approvals"
              />
            </SplitBarContent>

            <SplitBarContent value="history" className="mt-6">
              <DevDataTable
                title="Approval History"
                description="Past approval decisions and their outcomes"
                columns={approvalColumns}
                data={historyOnly}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                searchable
                searchPlaceholder="Filter approval history…"
                searchKeys={["vtid", "service", "type", "requestor", "status"]}
                emptyMessage="No approval history"
              />
            </SplitBarContent>

            <SplitBarContent value="policies" className="mt-6">
              <DevStatusGrid
                title="Approval Policies"
                description="Current governance policies affecting command approvals"
                items={[
                  {
                    name: "Execution Gate",
                    status: governance?.execution_disarmed ? "degraded" : "healthy",
                    detail: governance?.execution_disarmed ? "Disarmed — all commands blocked" : "Armed — approved commands will execute",
                  },
                  {
                    name: "Auto-Approve",
                    status: governance?.autopilot_loop_enabled ? "healthy" : "degraded",
                    detail: governance?.autopilot_loop_enabled ? "Enabled — low-risk commands auto-approved" : "Disabled — all commands need manual approval",
                  },
                  {
                    name: "Active Rules",
                    status: (governance?.active_rules || 0) > 0 ? "healthy" : "unknown",
                    detail: `${governance?.active_rules || 0} governance rules affecting approvals`,
                  },
                ]}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <RestoreSessionModal
        open={restoreSessionOpen}
        onOpenChange={setRestoreSessionOpen}
      />
    </>
  );
}
