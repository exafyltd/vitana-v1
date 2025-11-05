import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Building, Users, Globe, Filter } from "lucide-react";
import { devSettingsNavigation } from "@/config/dev-navigation";

export default function SettingsTenants() {
  const [activeTab, setActiveTab] = useState("list");

  return (
    <>
      <SEO 
        title="Vitana DEV — Tenant Management" 
        description="Tenant configurations and multi-tenant settings"
        canonical={window.location.href}
      />

      <SubNavigation items={devSettingsNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Tenant Management"
            description="Tenant configurations and multi-tenant settings"
            emoji="🏢"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search tenants…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="list">🏢 Tenant List</SplitBarTrigger>
              <SplitBarTrigger value="users">👤 Tenant Users</SplitBarTrigger>
              <SplitBarTrigger value="config">⚙️ Tenant Configs</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="list" className="mt-6">
              <DevEmptyState 
                title="Tenant List" 
                description="View all tenants: System, Maxina, Earthlinks, AlKalma."
                icon={Building}
              />
            </SplitBarContent>

            <SplitBarContent value="users" className="mt-6">
              <DevEmptyState 
                title="Tenant Users" 
                description="Manage users and access control for each tenant."
                icon={Users}
              />
            </SplitBarContent>

            <SplitBarContent value="config" className="mt-6">
              <DevEmptyState 
                title="Tenant Configurations" 
                description="Configure tenant-specific settings and customizations."
                icon={Globe}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
