import { DevTabs } from "@/components/dev/DevTabs";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { VTIDSnapshotPanel } from "@/components/dev/VTIDSnapshotPanel";
import SEO from "@/components/SEO";
import { Plus, BarChart3, Search } from "lucide-react";

export default function DevVTID() {
  const tabs = [
    {
      value: "registry",
      label: "Registry",
      content: <VTIDSnapshotPanel />
    },
    {
      value: "issue",
      label: "Issue",
      content: <DevEmptyState 
        title="Issue VTID" 
        description="Create and issue new VTIDs for the platform."
        icon={Plus}
      />
    },
    {
      value: "analytics",
      label: "Analytics",
      content: <DevEmptyState 
        title="VTID Analytics" 
        description="View VTID usage statistics and trends."
        icon={BarChart3}
      />
    },
    {
      value: "search",
      label: "Search",
      content: <DevEmptyState 
        title="VTID Search" 
        description="Search and filter VTIDs across the platform."
        icon={Search}
      />
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <SEO 
        title="Vitana DEV — VTID" 
        description="VTID management for Vitana platform"
        canonical={window.location.href}
      />
      
      <DevTabs defaultTab="registry" tabs={tabs} />
    </div>
  );
}
