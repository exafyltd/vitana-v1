import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevDataTable, DevDataColumn } from "@/components/dev/DevDataTable";
import { DevEventStream } from "@/components/dev/DevEventStream";
import { DevMetricsCard, DevMetricsGrid } from "@/components/dev/DevMetricsCard";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Plus, Shield, ListChecks } from "lucide-react";
import { devOasisNavigation } from "@/config/dev-navigation";
import { useGovernance } from "@/hooks/dev/useGovernance";
import { useOasisEvents } from "@/hooks/dev/useOasisEvents";

interface GovernanceRule extends Record<string, unknown> {
  id: string;
  name: string;
  condition: string;
  action: string;
  priority: number;
  enabled: boolean;
}

const policyColumns: DevDataColumn<GovernanceRule>[] = [
  {
    key: "name",
    label: "Policy Name",
    sortable: true,
    render: (row) => <span className="font-medium">{row.name}</span>,
  },
  {
    key: "condition",
    label: "Condition",
    render: (row) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.condition}</code>,
  },
  {
    key: "action",
    label: "Action",
    render: (row) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.action}</code>,
  },
  {
    key: "priority",
    label: "Priority",
    sortable: true,
    render: (row) => <Badge variant="outline">{row.priority}</Badge>,
  },
  {
    key: "enabled",
    label: "Status",
    sortable: true,
    render: (row) => (
      <Badge className={row.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
        {row.enabled ? "Active" : "Disabled"}
      </Badge>
    ),
  },
];

export default function OasisPolicies() {
  const [activeTab, setActiveTab] = useState("list");
  const [selectedRule, setSelectedRule] = useState<GovernanceRule | null>(null);
  const { governance, error: govError, available: govAvailable, isLoading: govLoading, refetch: govRefetch } = useGovernance();
  const { events: evalEvents, error: eventsError, available: eventsAvailable, isLoading: eventsLoading, refetch: eventsRefetch } = useOasisEvents({ type: "governance", limit: 50 });

  const rules: GovernanceRule[] = (governance?.rules || []).map(r => ({ ...r } as GovernanceRule));
  const enabledCount = rules.filter(r => r.enabled).length;

  return (
    <>
      <SEO
        title="Vitana DEV — OASIS Policies"
        description="OASIS policies and rules engine"
        canonical={window.location.href}
      />

      <SubNavigation items={devOasisNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <DevStandardHeader
            title="OASIS Policies"
            description="OASIS policies and rules engine (read-only in Phase 1)"
            emoji="🛡️"
          />

          <UtilityActionButton>
            <ExpandableSearchButton
              placeholder="Search policies…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" disabled>
              <Plus className="w-4 h-4 mr-2" />
              New Policy
            </Button>
          </UtilityActionButton>

          <DevMetricsGrid columns={3}>
            <DevMetricsCard title="Total Rules" value={rules.length} icon={Shield} />
            <DevMetricsCard title="Active Rules" value={enabledCount} icon={ListChecks} variant="success" />
            <DevMetricsCard title="Disabled Rules" value={rules.length - enabledCount} variant={rules.length - enabledCount > 0 ? "warning" : "default"} />
          </DevMetricsGrid>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="list">Policy List</SplitBarTrigger>
              <SplitBarTrigger value="editor">Policy Detail</SplitBarTrigger>
              <SplitBarTrigger value="logs">Evaluation Logs</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="list" className="mt-6">
              <DevDataTable
                title="Governance Policies"
                description="All governance rules and their configurations"
                columns={policyColumns}
                data={rules}
                isLoading={govLoading}
                error={govError}
                available={govAvailable}
                onRefresh={govRefetch}
                onRowClick={(row) => { setSelectedRule(row); setActiveTab("editor"); }}
                searchable
                searchPlaceholder="Filter policies by name, condition, action…"
                searchKeys={["name", "condition", "action"]}
                emptyMessage="No governance policies configured"
              />
            </SplitBarContent>

            <SplitBarContent value="editor" className="mt-6">
              {selectedRule ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{selectedRule.name}</CardTitle>
                    <CardDescription>Policy detail view (read-only)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Condition</p>
                        <code className="text-sm bg-muted px-2 py-1 rounded block mt-1">{selectedRule.condition}</code>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Action</p>
                        <code className="text-sm bg-muted px-2 py-1 rounded block mt-1">{selectedRule.action}</code>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Priority</p>
                        <p className="text-sm font-medium mt-1">{selectedRule.priority}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge className={`mt-1 ${selectedRule.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                          {selectedRule.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Select a policy from the Policy List tab to view details
                  </CardContent>
                </Card>
              )}
            </SplitBarContent>

            <SplitBarContent value="logs" className="mt-6">
              <DevEventStream
                title="Policy Evaluation Logs"
                description="Recent governance rule evaluations and decisions"
                events={evalEvents.map(e => ({ ...e, id: e.id }))}
                isLoading={eventsLoading}
                error={eventsError}
                available={eventsAvailable}
                onRefresh={eventsRefetch}
                emptyMessage="No governance evaluation events found"
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
