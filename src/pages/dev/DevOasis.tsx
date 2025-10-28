import { DevTabs } from "@/components/dev/DevTabs";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import SEO from "@/components/SEO";
import { Activity, Database, BookOpen, Shield } from "lucide-react";

export default function DevOasis() {
  const tabs = [
    {
      value: "events",
      label: "Events",
      content: <DevEmptyState 
        title="Event Stream" 
        description="Monitor real-time event streams in the OASIS system."
        icon={Activity}
      />
    },
    {
      value: "state",
      label: "State",
      content: <DevEmptyState 
        title="State Snapshots" 
        description="View current state snapshots and projections."
        icon={Database}
      />
    },
    {
      value: "ledger",
      label: "Ledger",
      content: <DevEmptyState 
        title="Immutable Ledger" 
        description="Browse the immutable event ledger and audit trail."
        icon={BookOpen}
      />
    },
    {
      value: "policies",
      label: "Policies",
      content: <DevEmptyState 
        title="Event Policies" 
        description="Configure event handling policies and rules."
        icon={Shield}
      />
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <SEO 
        title="Vitana DEV — OASIS" 
        description="OASIS event sourcing system for Vitana platform"
        canonical={window.location.href}
      />
      
      <DevTabs defaultTab="events" tabs={tabs} />
    </div>
  );
}
