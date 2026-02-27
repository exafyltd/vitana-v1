import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { DevDataTable, DevDataColumn } from "@/components/dev/DevDataTable";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Plus, Building2, Users, Globe } from "lucide-react";
import { devSettingsNavigation } from "@/config/dev-navigation";
import { useOasisEvents } from "@/hooks/dev/useOasisEvents";

const TENANTS = [
  { id: "vitana-main", name: "Vitana Main", active: true, users: 12, plan: "Enterprise" },
  { id: "vitana-dev", name: "Vitana Dev", active: true, users: 5, plan: "Developer" },
  { id: "orb-voice", name: "Orb Voice", active: true, users: 3, plan: "Enterprise" },
];

type TenantRecord = typeof TENANTS[number] & Record<string, unknown>;

const tenantColumns: DevDataColumn<TenantRecord>[] = [
  { key: "id", label: "Tenant ID", sortable: true, render: (row) => <code className="text-xs font-mono">{row.id}</code> },
  { key: "name", label: "Name", sortable: true, render: (row) => <span className="font-medium text-sm">{row.name}</span> },
  { key: "active", label: "Status", sortable: true, render: (row) => <Badge className={row.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{row.active ? "Active" : "Inactive"}</Badge> },
  { key: "users", label: "Users", sortable: true },
  { key: "plan", label: "Plan", render: (row) => <Badge variant="outline" className="text-xs">{row.plan}</Badge> },
];

export default function SettingsTenants() {
  const [activeTab, setActiveTab] = useState("list");
  const [selectedTenant, setSelectedTenant] = useState<TenantRecord | null>(null);
  const { events: tenantEvents, error, available, isLoading, refetch } = useOasisEvents({ limit: 50 });

  const tenants: TenantRecord[] = TENANTS.map(t => ({ ...t } as TenantRecord));

  return (
    <>
      <SEO title="Vitana DEV — Tenant Management" description="Multi-tenant configuration and management" canonical={window.location.href} />
      <SubNavigation items={devSettingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <DevStandardHeader title="Tenant Management" description="Multi-tenant configuration and management" emoji="🏢" />
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search tenants…" onSearch={(q) => console.log('Search:', q)} />
            <Button size="sm" disabled><Plus className="w-4 h-4 mr-2" />New Tenant</Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={3}>
            <DevMetricsCard title="Tenants" value={TENANTS.length} icon={Building2} />
            <DevMetricsCard title="Active" value={TENANTS.filter(t => t.active).length} icon={Globe} variant="success" />
            <DevMetricsCard title="Total Users" value={TENANTS.reduce((s, t) => s + t.users, 0)} icon={Users} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="list">Tenant List</SplitBarTrigger>
              <SplitBarTrigger value="details">Tenant Details</SplitBarTrigger>
              <SplitBarTrigger value="activity">Recent Activity</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="list" className="mt-6">
              <DevDataTable title="Tenants" description="All registered tenants" columns={tenantColumns} data={tenants} isLoading={false} error={null} available={true} onRowClick={(row) => { setSelectedTenant(row); setActiveTab("details"); }} searchable searchPlaceholder="Filter tenants…" searchKeys={["id", "name", "plan"]} emptyMessage="No tenants configured" />
            </SplitBarContent>

            <SplitBarContent value="details" className="mt-6">
              {selectedTenant ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{selectedTenant.name}</CardTitle>
                    <CardDescription>Tenant detail view</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-sm text-muted-foreground">Tenant ID</p><code className="text-sm mt-1 block">{selectedTenant.id}</code></div>
                      <div><p className="text-sm text-muted-foreground">Status</p><Badge className={`mt-1 ${selectedTenant.active ? "bg-green-100 text-green-800" : "bg-gray-100"}`}>{selectedTenant.active ? "Active" : "Inactive"}</Badge></div>
                      <div><p className="text-sm text-muted-foreground">Users</p><p className="font-medium mt-1">{selectedTenant.users}</p></div>
                      <div><p className="text-sm text-muted-foreground">Plan</p><Badge variant="outline" className="mt-1">{selectedTenant.plan}</Badge></div>
                    </div>
                  </CardContent>
                </Card>
              ) : <Card><CardContent className="py-12 text-center text-muted-foreground">Select a tenant to view details</CardContent></Card>}
            </SplitBarContent>

            <SplitBarContent value="activity" className="mt-6">
              <DevDataTable
                title="Recent Tenant Activity"
                description="Events across all tenants"
                columns={[
                  { key: "created_at", label: "Time", sortable: true, render: (row: Record<string, unknown>) => <span className="text-xs text-muted-foreground">{new Date(row.created_at as string).toLocaleString()}</span> },
                  { key: "service", label: "Service", sortable: true },
                  { key: "type", label: "Event", sortable: true, render: (row: Record<string, unknown>) => <Badge variant="outline" className="text-xs">{row.type as string}</Badge> },
                  { key: "message", label: "Message", render: (row: Record<string, unknown>) => <span className="text-sm truncate block max-w-[300px]">{row.message as string}</span> },
                ]}
                data={tenantEvents.map(e => ({ ...e } as Record<string, unknown>))}
                isLoading={isLoading}
                error={error}
                available={available}
                onRefresh={refetch}
                searchable
                searchPlaceholder="Filter activity…"
                searchKeys={["service", "type", "message"]}
                emptyMessage="No recent activity"
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
