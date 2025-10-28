import { DevTabs } from "@/components/dev/DevTabs";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import SEO from "@/components/SEO";
import { Terminal, CheckCircle, History, FileEdit } from "lucide-react";

export default function DevCommand() {
  const tabs = [
    {
      value: "queue",
      label: "Queue",
      content: <DevEmptyState 
        title="Command Queue" 
        description="View and manage pending commands in the execution queue."
        icon={Terminal}
      />
    },
    {
      value: "approvals",
      label: "Approvals",
      content: <DevEmptyState 
        title="Command Approvals" 
        description="Review and approve commands requiring authorization."
        icon={CheckCircle}
      />
    },
    {
      value: "history",
      label: "History",
      content: <DevEmptyState 
        title="Command History" 
        description="Browse the history of executed commands and their results."
        icon={History}
      />
    },
    {
      value: "compose",
      label: "Compose",
      content: <DevEmptyState 
        title="Command Composer" 
        description="Compose and execute custom commands with syntax highlighting."
        icon={FileEdit}
      />
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <SEO 
        title="Vitana DEV — Command" 
        description="Command execution hub for Vitana platform"
        canonical={window.location.href}
      />
      
      <DevTabs defaultTab="queue" tabs={tabs} />
    </div>
  );
}
