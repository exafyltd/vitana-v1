import { useState, useMemo } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevDataTable, DevDataColumn } from "@/components/dev/DevDataTable";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { DevEventStream } from "@/components/dev/DevEventStream";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Filter, Shield, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import { devAgentsNavigation } from "@/config/dev-navigation";
import { useOasisEvents } from "@/hooks/dev/useOasisEvents";
import { OasisEvent } from "@/lib/devGatewayClient";
import { formatDistanceToNow } from "date-fns";

const validationColumns: DevDataColumn<OasisEvent & Record<string, unknown>>[] = [
  {
    key: "created_at",
    label: "Time",
    sortable: true,
    render: (row) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
      </span>
    ),
  },
  {
    key: "vtid",
    label: "VTID",
    sortable: true,
    render: (row) => row.vtid ? <Badge variant="secondary" className="text-xs font-mono">{row.vtid}</Badge> : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "status",
    label: "Result",
    sortable: true,
    render: (row) => {
      const isPass = row.status === "green" || row.message?.toLowerCase().includes("pass");
      return (
        <Badge className={`text-xs ${isPass ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {isPass ? "Pass" : "Fail"}
        </Badge>
      );
    },
  },
  {
    key: "service",
    label: "Service",
    sortable: true,
  },
  {
    key: "message",
    label: "Details",
    className: "max-w-[300px]",
    render: (row) => <span className="text-sm truncate block">{row.message}</span>,
  },
];

export default function AgentsValidator() {
  const [activeTab, setActiveTab] = useState("results");
  const { events, error, available, isLoading, refetch } = useOasisEvents({ type: "vtid.stage.validator", limit: 100 });

  const eventsAsRecords = events.map(e => ({ ...e } as OasisEvent & Record<string, unknown>));

  const passCount = useMemo(() => events.filter(e => e.status === "green" || e.message?.toLowerCase().includes("pass")).length, [events]);
  const failCount = events.length - passCount;
  const passRate = events.length > 0 ? ((passCount / events.length) * 100).toFixed(1) : "—";

  const errorEvents = events.filter(e => e.status === "red" || e.message?.toLowerCase().includes("fail"));

  return (
    <>
      <SEO
        title="Vitana DEV — Validator Agents"
        description="Validation logs and quality checks"
        canonical={window.location.href}
      />

      <SubNavigation items={devAgentsNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <DevStandardHeader
            title="Validator Agents"
            description="Validation logs and quality checks"
            emoji="🛡️"
          />

          <UtilityActionButton>
            <ExpandableSearchButton
              placeholder="Search validations…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => refetch()}>
              <Filter className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={4}>
            <DevMetricsCard title="Total Validations" value={events.length} icon={Shield} />
            <DevMetricsCard title="Passed" value={passCount} icon={CheckCircle} variant="success" />
            <DevMetricsCard title="Failed" value={failCount} icon={XCircle} variant={failCount > 0 ? "danger" : "default"} />
            <DevMetricsCard title="Pass Rate" value={`${passRate}%`} icon={BarChart3} variant={Number(passRate) > 90 ? "success" : Number(passRate) > 70 ? "warning" : "danger"} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="results">Validation Results</SplitBarTrigger>
              <SplitBarTrigger value="metrics">Quality Metrics</SplitBarTrigger>
              <SplitBarTrigger value="errors">Error Logs ({errorEvents.length})</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="results" className="mt-6">
              <DevDataTable
                title="Validation Results"
                description="Recent validation checks with pass/fail status"
                columns={validationColumns}
                data={eventsAsRecords}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                searchable
                searchPlaceholder="Filter by VTID, service, message…"
                searchKeys={["vtid", "service", "message", "status"]}
                emptyMessage="No validation results yet"
              />
            </SplitBarContent>

            <SplitBarContent value="metrics" className="mt-6">
              <DevEventStream
                title="Validation Activity Stream"
                description="Live feed of validation events"
                events={events.map(e => ({ ...e, id: e.id }))}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                emptyMessage="No validation events"
              />
            </SplitBarContent>

            <SplitBarContent value="errors" className="mt-6">
              <DevDataTable
                title="Failed Validations"
                description="Validation checks that failed"
                columns={validationColumns}
                data={eventsAsRecords.filter(e => e.status === "red" || (e.message as string)?.toLowerCase().includes("fail"))}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                searchable
                searchPlaceholder="Filter failed validations…"
                searchKeys={["vtid", "service", "message"]}
                emptyMessage="No failed validations"
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
