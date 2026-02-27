import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevDataTable, DevDataColumn } from "@/components/dev/DevDataTable";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { DevStatusGrid } from "@/components/dev/DevStatusGrid";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Plus, Cpu, Wifi, Clock } from "lucide-react";
import { devAgentsNavigation } from "@/config/dev-navigation";
import { useWorkerStatus } from "@/hooks/dev/useWorkerStatus";
import { WorkerInfo, PendingTask } from "@/lib/devGatewayClient";
import { formatDistanceToNow } from "date-fns";

const workerStatusColors: Record<string, string> = {
  online: "bg-green-100 text-green-800",
  busy: "bg-yellow-100 text-yellow-800",
  offline: "bg-red-100 text-red-800",
};

const workerColumns: DevDataColumn<WorkerInfo & Record<string, unknown>>[] = [
  {
    key: "name",
    label: "Worker",
    sortable: true,
    render: (row) => <span className="font-medium text-sm">{row.name}</span>,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (row) => <Badge className={`text-xs ${workerStatusColors[row.status] || "bg-gray-100"}`}>{row.status}</Badge>,
  },
  {
    key: "capabilities",
    label: "Capabilities",
    render: (row) => (
      <div className="flex gap-1 flex-wrap">
        {(row.capabilities as string[]).slice(0, 3).map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
        {(row.capabilities as string[]).length > 3 && <Badge variant="outline" className="text-xs">+{(row.capabilities as string[]).length - 3}</Badge>}
      </div>
    ),
  },
  {
    key: "claimed_vtid",
    label: "Claimed VTID",
    render: (row) => row.claimed_vtid ? <Badge variant="secondary" className="text-xs font-mono">{row.claimed_vtid}</Badge> : <span className="text-muted-foreground text-xs">—</span>,
  },
  {
    key: "last_heartbeat",
    label: "Last Heartbeat",
    sortable: true,
    render: (row) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(row.last_heartbeat as string), { addSuffix: true })}
      </span>
    ),
  },
];

const taskColumns: DevDataColumn<PendingTask & Record<string, unknown>>[] = [
  {
    key: "vtid",
    label: "VTID",
    sortable: true,
    render: (row) => <Badge variant="secondary" className="text-xs font-mono">{row.vtid}</Badge>,
  },
  {
    key: "title",
    label: "Title",
    sortable: true,
    className: "max-w-[250px]",
    render: (row) => <span className="text-sm truncate block">{row.title}</span>,
  },
  {
    key: "priority",
    label: "Priority",
    sortable: true,
    render: (row) => <Badge variant="outline">{row.priority}</Badge>,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (row) => <Badge variant="outline" className="text-xs">{row.status}</Badge>,
  },
  {
    key: "target_roles",
    label: "Target Roles",
    render: (row) => (
      <div className="flex gap-1 flex-wrap">
        {(row.target_roles as string[]).map(r => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}
      </div>
    ),
  },
  {
    key: "created_at",
    label: "Queued",
    sortable: true,
    render: (row) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(row.created_at as string), { addSuffix: true })}
      </span>
    ),
  },
];

export default function AgentsWorker() {
  const [activeTab, setActiveTab] = useState("active");
  const { workers, pendingTasks, onlineCount, busyCount, error, available, isLoading, refetch } = useWorkerStatus();

  const workersAsRecords = workers.map(w => ({ ...w } as WorkerInfo & Record<string, unknown>));
  const tasksAsRecords = pendingTasks.map(t => ({ ...t } as PendingTask & Record<string, unknown>));

  return (
    <>
      <SEO
        title="Vitana DEV — Worker Agents"
        description="Active worker agents and task assignments"
        canonical={window.location.href}
      />

      <SubNavigation items={devAgentsNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <DevStandardHeader
            title="Worker Agents"
            description="Active worker agents and task assignments"
            emoji="🤖"
          />

          <UtilityActionButton>
            <ExpandableSearchButton
              placeholder="Search workers…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" disabled>
              <Plus className="w-4 h-4 mr-2" />
              New Worker
            </Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={4}>
            <DevMetricsCard title="Total Workers" value={workers.length} icon={Cpu} />
            <DevMetricsCard title="Online" value={onlineCount} icon={Wifi} variant="success" />
            <DevMetricsCard title="Busy" value={busyCount} variant="warning" />
            <DevMetricsCard title="Pending Tasks" value={pendingTasks.length} icon={Clock} variant={pendingTasks.length > 5 ? "warning" : "default"} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="active">Active Workers</SplitBarTrigger>
              <SplitBarTrigger value="queue">Task Queue ({pendingTasks.length})</SplitBarTrigger>
              <SplitBarTrigger value="status">Worker Status</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="active" className="mt-6">
              <DevDataTable
                title="Worker Registry"
                description="All registered workers with status and capabilities"
                columns={workerColumns}
                data={workersAsRecords}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                searchable
                searchPlaceholder="Filter workers by name, status, capabilities…"
                searchKeys={["name", "status", "claimed_vtid"]}
                emptyMessage="No workers registered"
              />
            </SplitBarContent>

            <SplitBarContent value="queue" className="mt-6">
              <DevDataTable
                title="Pending Task Queue"
                description="Tasks awaiting worker assignment"
                columns={taskColumns}
                data={tasksAsRecords}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                searchable
                searchPlaceholder="Filter tasks by VTID, title…"
                searchKeys={["vtid", "title", "status"]}
                emptyMessage="No pending tasks in queue"
              />
            </SplitBarContent>

            <SplitBarContent value="status" className="mt-6">
              <DevStatusGrid
                title="Worker Health"
                description="Health status of all registered workers"
                items={workers.map(w => ({
                  name: w.name,
                  status: w.status === "online" ? "healthy" as const : w.status === "busy" ? "degraded" as const : "down" as const,
                  detail: w.claimed_vtid ? `Working on ${w.claimed_vtid}` : `Last heartbeat ${formatDistanceToNow(new Date(w.last_heartbeat), { addSuffix: true })}`,
                }))}
                isLoading={isLoading}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
