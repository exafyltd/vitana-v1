import { DevTabs } from "@/components/dev/DevTabs";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import SEO from "@/components/SEO";
import { GitBranch, PlayCircle, Archive, Grid3x3 } from "lucide-react";

export default function DevCICD() {
  const tabs = [
    {
      value: "workflows",
      label: "Workflows",
      content: <DevEmptyState 
        title="Workflow Definitions" 
        description="View and manage CI/CD workflow definitions."
        icon={GitBranch}
      />
    },
    {
      value: "runs",
      label: "Runs",
      content: <DevEmptyState 
        title="Workflow Runs" 
        description="Monitor workflow execution history and status."
        icon={PlayCircle}
      />
    },
    {
      value: "artifacts",
      label: "Artifacts",
      content: <DevEmptyState 
        title="Build Artifacts" 
        description="Browse and download build artifacts."
        icon={Archive}
      />
    },
    {
      value: "matrix",
      label: "Env Matrix",
      content: <DevEmptyState 
        title="Environment Matrix" 
        description="Configure deployment environment matrix."
        icon={Grid3x3}
      />
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <SEO 
        title="Vitana DEV — CI/CD" 
        description="CI/CD deployment management for Vitana platform"
        canonical={window.location.href}
      />
      
      <DevTabs defaultTab="workflows" tabs={tabs} />
    </div>
  );
}
