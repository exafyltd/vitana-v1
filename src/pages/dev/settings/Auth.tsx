import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Lock, Key, ShieldCheck, Settings } from "lucide-react";
import { devSettingsNavigation } from "@/config/dev-navigation";

export default function SettingsAuth() {
  const [activeTab, setActiveTab] = useState("config");

  return (
    <>
      <SEO 
        title="Vitana DEV — Authentication Settings" 
        description="Authentication settings and Supabase configuration"
        canonical={window.location.href}
      />

      <SubNavigation items={devSettingsNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Authentication Settings"
            description="Authentication settings and Supabase configuration"
            emoji="🔐"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search settings…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Configure
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="config">⚙️ Supabase Config</SplitBarTrigger>
              <SplitBarTrigger value="providers">🔑 Auth Providers</SplitBarTrigger>
              <SplitBarTrigger value="jwt">🎫 JWT Settings</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="config" className="mt-6">
              <DevEmptyState 
                title="Supabase Configuration" 
                description="View Supabase authentication configuration and settings."
                icon={Lock}
              />
            </SplitBarContent>

            <SplitBarContent value="providers" className="mt-6">
              <DevEmptyState 
                title="Auth Providers" 
                description="Manage authentication providers and OAuth configurations."
                icon={Key}
              />
            </SplitBarContent>

            <SplitBarContent value="jwt" className="mt-6">
              <DevEmptyState 
                title="JWT Settings" 
                description="Configure JWT token settings and validation rules."
                icon={ShieldCheck}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
