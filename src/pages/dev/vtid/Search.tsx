import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevDataTable, DevDataColumn } from "@/components/dev/DevDataTable";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Filter } from "lucide-react";
import { devVTIDNavigation } from "@/config/dev-navigation";
import { useVTIDLedger, useVTIDDetail } from "@/hooks/dev/useVTIDLedger";
import { VTIDRecord } from "@/lib/devGatewayClient";
import { formatDistanceToNow } from "date-fns";

const statusBadgeColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  blocked: "bg-orange-100 text-orange-800",
};

const vtidColumns: DevDataColumn<VTIDRecord & Record<string, unknown>>[] = [
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
    key: "status",
    label: "Status",
    sortable: true,
    render: (row) => (
      <Badge className={`text-xs ${statusBadgeColors[row.status] || "bg-gray-100 text-gray-800"}`}>
        {row.status}
      </Badge>
    ),
  },
  {
    key: "spec_status",
    label: "Spec Status",
    sortable: true,
    render: (row) => <Badge variant="outline" className="text-xs">{row.spec_status}</Badge>,
  },
  {
    key: "claimed_by",
    label: "Claimed By",
    sortable: true,
    render: (row) => row.claimed_by ? <span className="text-sm">{row.claimed_by}</span> : <span className="text-muted-foreground text-sm">—</span>,
  },
  {
    key: "is_terminal",
    label: "Terminal",
    sortable: true,
    render: (row) => row.is_terminal ? <Badge className="bg-purple-100 text-purple-800 text-xs">Yes</Badge> : <span className="text-muted-foreground text-xs">No</span>,
  },
  {
    key: "created_at",
    label: "Created",
    sortable: true,
    render: (row) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
      </span>
    ),
  },
];

export default function VTIDSearch() {
  const [activeTab, setActiveTab] = useState("search");
  const [selectedVtid, setSelectedVtid] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { vtids, error, available, isLoading, refetch } = useVTIDLedger({ limit: 100, search: searchQuery || undefined });
  const { vtid: vtidDetail, isLoading: detailLoading } = useVTIDDetail(selectedVtid);

  const vtidsAsRecords = vtids.map(v => ({ ...v } as VTIDRecord & Record<string, unknown>));

  return (
    <>
      <SEO
        title="Vitana DEV — VTID Search"
        description="Search and lookup VTIDs across the platform"
        canonical={window.location.href}
      />

      <SubNavigation items={devVTIDNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <DevStandardHeader
            title="VTID Search"
            description="Search and lookup VTIDs across the platform"
            emoji="🔍"
          />

          <UtilityActionButton>
            <ExpandableSearchButton
              placeholder="Search VTIDs…"
              onSearch={(query) => setSearchQuery(query)}
            />
            <Button size="sm" variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="search">Search Results</SplitBarTrigger>
              <SplitBarTrigger value="recent">All VTIDs</SplitBarTrigger>
              <SplitBarTrigger value="details">VTID Details</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="search" className="mt-6">
              <DevDataTable
                title="VTID Search Results"
                description={searchQuery ? `Results for "${searchQuery}"` : "Showing all VTIDs — use the search bar above to filter"}
                columns={vtidColumns}
                data={vtidsAsRecords}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                onRowClick={(row) => { setSelectedVtid(row.vtid as string); setActiveTab("details"); }}
                searchable
                searchPlaceholder="Filter by VTID, title, status…"
                searchKeys={["vtid", "title", "status", "spec_status", "claimed_by"]}
                emptyMessage="No VTIDs found"
              />
            </SplitBarContent>

            <SplitBarContent value="recent" className="mt-6">
              <DevDataTable
                title="All VTIDs"
                description="Complete VTID ledger sorted by most recent"
                columns={vtidColumns}
                data={vtidsAsRecords}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                onRowClick={(row) => { setSelectedVtid(row.vtid as string); setActiveTab("details"); }}
                searchable
                searchPlaceholder="Filter VTIDs…"
                searchKeys={["vtid", "title", "status", "claimed_by"]}
              />
            </SplitBarContent>

            <SplitBarContent value="details" className="mt-6">
              {vtidDetail ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-mono">{vtidDetail.vtid}</Badge>
                      <Badge className={`${statusBadgeColors[vtidDetail.status] || "bg-gray-100 text-gray-800"}`}>
                        {vtidDetail.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">{vtidDetail.title}</CardTitle>
                    <CardDescription>VTID detail view</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="text-sm font-medium mt-1">{vtidDetail.status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Spec Status</p>
                        <p className="text-sm font-medium mt-1">{vtidDetail.spec_status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Claimed By</p>
                        <p className="text-sm font-medium mt-1">{vtidDetail.claimed_by || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Terminal</p>
                        <p className="text-sm font-medium mt-1">{vtidDetail.is_terminal ? `Yes — ${vtidDetail.terminal_outcome}` : "No"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Target Roles</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {vtidDetail.target_roles.map(r => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="text-sm font-medium mt-1">{new Date(vtidDetail.created_at).toLocaleString()}</p>
                      </div>
                      {vtidDetail.claimed_until && (
                        <div>
                          <p className="text-sm text-muted-foreground">Claimed Until</p>
                          <p className="text-sm font-medium mt-1">{new Date(vtidDetail.claimed_until).toLocaleString()}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Updated</p>
                        <p className="text-sm font-medium mt-1">{new Date(vtidDetail.updated_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : detailLoading ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Loading VTID details…
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Select a VTID from the Search or All VTIDs tab to view details
                  </CardContent>
                </Card>
              )}
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
