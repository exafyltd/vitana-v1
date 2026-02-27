import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevDataTable, DevDataColumn } from "@/components/dev/DevDataTable";
import { DevEventStream } from "@/components/dev/DevEventStream";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Filter } from "lucide-react";
import { devOasisNavigation } from "@/config/dev-navigation";
import { useOasisEvents } from "@/hooks/dev/useOasisEvents";
import { OasisEvent } from "@/lib/devGatewayClient";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  green: "bg-green-100 text-green-800",
  blue: "bg-blue-100 text-blue-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
};

const ledgerColumns: DevDataColumn<OasisEvent & Record<string, unknown>>[] = [
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
    render: (row) => row.vtid ? <Badge variant="secondary" className="text-xs">{row.vtid}</Badge> : <span className="text-muted-foreground">—</span>,
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
    render: (row) => <Badge variant="outline" className="text-xs">{row.type}</Badge>,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (row) => (
      <Badge className={`text-xs ${statusColors[row.status] || "bg-gray-100 text-gray-800"}`}>
        {row.status}
      </Badge>
    ),
  },
  {
    key: "message",
    label: "Message",
    className: "max-w-[300px]",
    render: (row) => <span className="text-sm truncate block">{row.message}</span>,
  },
];

export default function OasisLedger() {
  const [activeTab, setActiveTab] = useState("transactions");
  const [serviceFilter, setServiceFilter] = useState<string | undefined>();
  const { events, error, available, isLoading, refetch } = useOasisEvents({ limit: 100, service: serviceFilter });

  const eventsAsRecords = events.map(e => ({ ...e } as OasisEvent & Record<string, unknown>));

  return (
    <>
      <SEO
        title="Vitana DEV — OASIS Ledger"
        description="Event ledger and transaction history"
        canonical={window.location.href}
      />

      <SubNavigation items={devOasisNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <DevStandardHeader
            title="OASIS Ledger"
            description="Event ledger and transaction history"
            emoji="📖"
          />

          <UtilityActionButton>
            <ExpandableSearchButton
              placeholder="Search ledger…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" variant={serviceFilter ? "default" : "outline"} onClick={() => setServiceFilter(undefined)}>
              <Filter className="w-4 h-4 mr-2" />
              {serviceFilter ? `Service: ${serviceFilter}` : "All Services"}
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="transactions">Transaction Logs</SplitBarTrigger>
              <SplitBarTrigger value="viewer">Ledger Viewer</SplitBarTrigger>
              <SplitBarTrigger value="audit">Audit Trail</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="transactions" className="mt-6">
              <DevDataTable
                title="OASIS Event Ledger"
                description="Full event log with service, type, status, and message columns"
                columns={ledgerColumns}
                data={eventsAsRecords}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                searchable
                searchPlaceholder="Filter events by VTID, service, type…"
                searchKeys={["vtid", "service", "type", "message", "status"]}
                emptyMessage="No OASIS events recorded yet"
              />
            </SplitBarContent>

            <SplitBarContent value="viewer" className="mt-6">
              <DevEventStream
                title="Live Event Stream"
                description="Chronological view of OASIS events with auto-refresh"
                events={events.map(e => ({ ...e, id: e.id }))}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
              />
            </SplitBarContent>

            <SplitBarContent value="audit" className="mt-6">
              <DevDataTable
                title="Audit Trail"
                description="Governance and compliance-related events"
                columns={ledgerColumns}
                data={eventsAsRecords.filter(e =>
                  e.type?.includes("governance") || e.type?.includes("audit") || e.type?.includes("approval")
                )}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                searchable
                searchPlaceholder="Filter audit events…"
                searchKeys={["vtid", "service", "type", "message"]}
                emptyMessage="No audit events found"
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
