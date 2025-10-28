import { DevTabs } from "@/components/dev/DevTabs";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import SEO from "@/components/SEO";
import { Globe, Activity, Smartphone, Webhook } from "lucide-react";

export default function DevGateway() {
  const tabs = [
    {
      value: "endpoints",
      label: "Endpoints",
      content: <DevEmptyState 
        title="API Endpoints" 
        description="View and manage registered API endpoints."
        icon={Globe}
      />
    },
    {
      value: "requests",
      label: "Requests",
      content: <DevEmptyState 
        title="Recent Requests" 
        description="Monitor recent API requests and responses."
        icon={Activity}
      />
    },
    {
      value: "mobile",
      label: "Mobile Links",
      content: <DevEmptyState 
        title="Mobile Deep Links" 
        description="Configure deep link routing for mobile apps."
        icon={Smartphone}
      />
    },
    {
      value: "webhooks",
      label: "Webhooks",
      content: <DevEmptyState 
        title="Webhook Management" 
        description="Manage webhook configurations and delivery."
        icon={Webhook}
      />
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <SEO 
        title="Vitana DEV — Gateway" 
        description="API gateway management for Vitana platform"
        canonical={window.location.href}
      />
      
      <DevTabs defaultTab="endpoints" tabs={tabs} />
    </div>
  );
}
