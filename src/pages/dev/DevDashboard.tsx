import { useState, useEffect } from "react";
import { DevTabs } from "@/components/dev/DevTabs";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { LiveEventsPanel } from "@/components/dev/LiveEventsPanel";
import { VTIDSnapshotPanel } from "@/components/dev/VTIDSnapshotPanel";
import { CommandConsolePanel } from "@/components/dev/CommandConsolePanel";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { Activity, Bell, Heart } from "lucide-react";

export default function DevDashboard() {
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

  const overviewContent = (
    <div className="space-y-4 md:space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row md:flex-wrap gap-4 items-start md:items-center">
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
    </div>
  );

  const tabs = [
    {
      value: "overview",
      label: "Overview",
      content: overviewContent
    },
    {
      value: "ai-feed",
      label: "AI Feed",
      content: <DevEmptyState 
        title="AI Activity Feed" 
        description="Monitor AI agent activities and interactions across the platform."
        icon={Activity}
      />
    },
    {
      value: "alerts",
      label: "Alerts",
      content: <DevEmptyState 
        title="System Alerts" 
        description="View system alerts and notifications requiring attention."
        icon={Bell}
      />
    },
    {
      value: "health",
      label: "System Health",
      content: <DevEmptyState 
        title="System Health Metrics" 
        description="Monitor overall system health and performance indicators."
        icon={Heart}
      />
    },
  ];

  return (
    <>
      <SEO 
        title="Vitana DEV — Dashboard" 
        description="Command hub dashboard for Vitana platform operations"
        canonical={window.location.href}
      />
      
      <DevTabs defaultTab="overview" tabs={tabs} />
    </>
  );
}
