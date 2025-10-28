import { DevTabs } from "@/components/dev/DevTabs";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import SEO from "@/components/SEO";
import { Package, TestTube2, Rocket, Undo2 } from "lucide-react";

export default function DevPipelines() {
  const tabs = [
    {
      value: "builds",
      label: "Builds",
      content: <DevEmptyState 
        title="Build History" 
        description="Monitor build pipelines and deployment status."
        icon={Package}
      />
    },
    {
      value: "tests",
      label: "Tests",
      content: <DevEmptyState 
        title="Test Runs" 
        description="View automated test execution results and coverage."
        icon={TestTube2}
      />
    },
    {
      value: "canary",
      label: "Canary",
      content: <DevEmptyState 
        title="Canary Deployments" 
        description="Track canary deployment status and metrics."
        icon={Rocket}
      />
    },
    {
      value: "rollbacks",
      label: "Rollbacks",
      content: <DevEmptyState 
        title="Rollback History" 
        description="Review rollback operations and their outcomes."
        icon={Undo2}
      />
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <SEO 
        title="Vitana DEV — Pipelines" 
        description="CI/CD pipeline monitoring for Vitana platform"
        canonical={window.location.href}
      />
      
      <DevTabs defaultTab="builds" tabs={tabs} />
    </div>
  );
}
