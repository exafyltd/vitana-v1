import { useState, useEffect } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { LiveEventsPanel } from "@/components/dev/LiveEventsPanel";
import { VTIDSnapshotPanel } from "@/components/dev/VTIDSnapshotPanel";
import { CommandConsolePanel } from "@/components/dev/CommandConsolePanel";
import { Button } from "@/components/ui/button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Activity, Bell, Heart, Plus } from "lucide-react";
import { devDashboardNavigation } from "@/config/dev-navigation";
import { RestoreSessionButton } from "@/components/dev/RestoreSessionButton";
import { RestoreSessionModal } from "@/components/dev/modals/RestoreSessionModal";

export default function DevDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [restoreSessionOpen, setRestoreSessionOpen] = useState(false);
  const [tenantFilter, setTenantFilter] = useState(() => {
    return localStorage.getItem('dev_dashboard_tenant') || 'system';
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    return localStorage.getItem('dev_dashboard_status') || 'all';
  });

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('dev_dashboard_tenant', tenantFilter);
  }, [tenantFilter]);

  useEffect(() => {
    localStorage.setItem('dev_dashboard_status', statusFilter);
  }, [statusFilter]);

  const tenants = ['All', 'System', 'Maxina', 'Earthlinks', 'AlKalma'];
  const statuses = ['All', 'Green', 'Blue', 'Yellow', 'Red'];

  return (
    <>
      <SEO 
        title="Vitana DEV — Dashboard" 
        description="Command hub dashboard for Vitana platform operations"
        canonical={window.location.href}
      />

      {/* Horizontal Navigation for Dashboard category */}
      <SubNavigation items={devDashboardNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* 3-Card Header */}
          <DevStandardHeader 
            title="VITANA DEV Command Hub"
            description="Real-time event monitoring, VTID management, and system control"
            emoji="⚙️"
          />

          {/* Utility Action Buttons */}
          <UtilityActionButton
            trailingElement={<RestoreSessionButton onClick={() => setRestoreSessionOpen(true)} />}
          >
            <ExpandableSearchButton 
              placeholder="Search events, VTIDs, commands…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Action
            </Button>
          </UtilityActionButton>

          {/* Split-Screen Navigation Bar (sub-tabs) */}
          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="overview">📊 Overview</SplitBarTrigger>
              <SplitBarTrigger value="ai-feed">🤖 AI Feed</SplitBarTrigger>
              <SplitBarTrigger value="alerts">🔔 Alerts</SplitBarTrigger>
              <SplitBarTrigger value="health">💚 System Health</SplitBarTrigger>
            </SplitBarList>

            {/* Overview Tab Content */}
            <SplitBarContent value="overview" className="mt-6">
              {/* Filters: Tenant & Status */}
              <div className="flex flex-col md:flex-row md:flex-wrap gap-4 items-start md:items-center mb-6">
                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                  <span className="text-sm font-medium whitespace-nowrap">Tenant:</span>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide w-full md:w-auto">
                    {tenants.map((tenant) => (
                      <Button
                        key={tenant}
                        variant={tenantFilter === tenant.toLowerCase() ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTenantFilter(tenant.toLowerCase())}
                        className="min-h-[44px] md:min-h-0 whitespace-nowrap"
                      >
                        {tenant}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                  <span className="text-sm font-medium whitespace-nowrap">Status:</span>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide w-full md:w-auto">
                    {statuses.map((status) => (
                      <Button
                        key={status}
                        variant={statusFilter === status.toLowerCase() ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter(status.toLowerCase())}
                        className="min-h-[44px] md:min-h-0 whitespace-nowrap"
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dashboard Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-2 space-y-4 md:space-y-6">
                  <LiveEventsPanel 
                    tenant={tenantFilter === 'all' ? 'system' : tenantFilter}
                    status={statusFilter as 'all' | 'green' | 'blue' | 'yellow' | 'red'}
                  />
                  <VTIDSnapshotPanel />
                </div>
                
                <div>
                  <CommandConsolePanel />
                </div>
              </div>
            </SplitBarContent>

            {/* AI Feed Tab Content */}
            <SplitBarContent value="ai-feed" className="mt-6">
              <DevEmptyState 
                title="AI Activity Feed" 
                description="Monitor AI agent activities and interactions across the platform."
                icon={Activity}
              />
            </SplitBarContent>

            {/* Alerts Tab Content */}
            <SplitBarContent value="alerts" className="mt-6">
              <DevEmptyState 
                title="System Alerts" 
                description="View system alerts and notifications requiring attention."
                icon={Bell}
              />
            </SplitBarContent>

            {/* System Health Tab Content */}
            <SplitBarContent value="health" className="mt-6">
              <DevEmptyState 
                title="System Health Metrics" 
                description="Monitor overall system health and performance indicators."
                icon={Heart}
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
