import { DevTabs } from "@/components/dev/DevTabs";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import SEO from "@/components/SEO";
import { FileText, GitBranch, BarChart, DollarSign } from "lucide-react";

export default function DevObservability() {
  const tabs = [
    {
      value: "logs",
      label: "Logs",
      content: <DevEmptyState 
        title="Aggregated Logs" 
        description="View and search system logs across all services."
        icon={FileText}
      />
    },
    {
      value: "traces",
      label: "Traces",
      content: <DevEmptyState 
        title="Distributed Traces" 
        description="Analyze distributed request traces."
        icon={GitBranch}
      />
    },
    {
      value: "metrics",
      label: "Metrics",
      content: <DevEmptyState 
        title="System Metrics" 
        description="Monitor performance metrics and system health."
        icon={BarChart}
      />
    },
    {
      value: "costs",
      label: "Costs",
      content: <DevEmptyState 
        title="Cost Breakdown" 
        description="View resource costs by tenant and service."
        icon={DollarSign}
      />
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <SEO 
        title="Vitana DEV — Observability" 
        description="Observability and monitoring for Vitana platform"
        canonical={window.location.href}
      />
      
      <DevTabs defaultTab="logs" tabs={tabs} />
    </div>
  );
}
