import { useState } from "react";
import { DevHubHeader } from "@/components/dev/DevHubHeader";
import { LiveEventsPanel } from "@/components/dev/LiveEventsPanel";
import { VTIDSnapshotPanel } from "@/components/dev/VTIDSnapshotPanel";
import { CommandConsolePanel } from "@/components/dev/CommandConsolePanel";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

export default function DevDashboard() {
  const [tenantFilter, setTenantFilter] = useState('system');
  const [statusFilter, setStatusFilter] = useState('all');

  const tenants = ['All', 'System', 'Maxina', 'Earthlinks', 'AlKalma'];
  const statuses = ['All', 'Green', 'Blue', 'Yellow', 'Red'];

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Vitana DEV — Dashboard" 
        description="Command hub dashboard for Vitana platform operations"
        canonical={window.location.href}
      />
      
      <DevHubHeader />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">Tenant:</span>
            {tenants.map((tenant) => (
              <Button
                key={tenant}
                variant={tenantFilter === tenant.toLowerCase() ? "default" : "outline"}
                size="sm"
                onClick={() => setTenantFilter(tenant.toLowerCase())}
              >
                {tenant}
              </Button>
            ))}
          </div>
          
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">Status:</span>
            {statuses.map((status) => (
              <Button
                key={status}
                variant={statusFilter === status.toLowerCase() ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status.toLowerCase())}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        {/* Dashboard Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <LiveEventsPanel tenant={tenantFilter === 'all' ? 'system' : tenantFilter} />
            <VTIDSnapshotPanel />
          </div>
          
          <div>
            <CommandConsolePanel />
          </div>
        </div>
      </main>
    </div>
  );
}
