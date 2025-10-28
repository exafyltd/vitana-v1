import { DevTabs } from "@/components/dev/DevTabs";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import SEO from "@/components/SEO";
import { Brain, Cpu, Shield, TestTube, Users } from "lucide-react";

export default function DevAgents() {
  const tabs = [
    {
      value: "planner",
      label: "Planner",
      content: <DevEmptyState 
        title="Planning Agent" 
        description="Monitor the planning agent's task decomposition and strategy."
        icon={Brain}
      />
    },
    {
      value: "worker",
      label: "Worker",
      content: <DevEmptyState 
        title="Worker Agent Pool" 
        description="View active workers and their current task assignments."
        icon={Cpu}
      />
    },
    {
      value: "validator",
      label: "Validator",
      content: <DevEmptyState 
        title="Validation Agent" 
        description="Review validation logs and quality checks."
        icon={Shield}
      />
    },
    {
      value: "qa",
      label: "QA/Test",
      content: <DevEmptyState 
        title="QA Agent" 
        description="View automated test results and QA agent reports."
        icon={TestTube}
      />
    },
    {
      value: "crew",
      label: "Crew Template",
      content: <DevEmptyState 
        title="Agent Crew Templates" 
        description="Manage and configure agent crew templates for orchestration."
        icon={Users}
      />
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <SEO 
        title="Vitana DEV — Agents" 
        description="Agent orchestration dashboard for Vitana platform"
        canonical={window.location.href}
      />
      
      <DevTabs defaultTab="planner" tabs={tabs} />
    </div>
  );
}
