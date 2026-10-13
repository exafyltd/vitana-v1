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
import { Flag, ToggleLeft, Settings, Plus } from "lucide-react";
import { devSettingsNavigation } from "@/config/dev-navigation";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";

export default function SettingsFlags() {
  const spotlight = useSpotlightEnabled();
  const [activeTab, setActiveTab] = useState("list");

  const devBody = (
    <>
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Feature Flags"
            description="Feature flags management (read-only in Phase 1)"
            emoji="🚩"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search flags…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm" disabled>
              <Plus className="w-4 h-4 me-2" />
              New Flag
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-surface-raised/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="list">🚩 Flag List</SplitBarTrigger>
              <SplitBarTrigger value="status">🔘 Flag Status</SplitBarTrigger>
              <SplitBarTrigger value="history">📜 Flag History</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="list" className="mt-6">
              <DevEmptyState 
                title="Feature Flag List" 
                description="Browse all feature flags and their configurations."
                icon={Flag}
              />
            </SplitBarContent>

            <SplitBarContent value="status" className="mt-6">
              <DevEmptyState 
                title="Flag Status" 
                description="View the current status of feature flags across environments."
                icon={ToggleLeft}
              />
            </SplitBarContent>

            <SplitBarContent value="history" className="mt-6">
              <DevEmptyState 
                title="Flag History" 
                description="Track feature flag changes and historical configurations."
                icon={Settings}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
    </>
  );

  return (
    <>
      <SEO 
        title="Vitana DEV — Feature Flags" 
        description="Feature flags management and configuration"
        canonical={window.location.href}
      />

      <SubNavigation items={devSettingsNavigation} />

      {spotlight ? (
        <ScreenFrame archetype="workspace">
          {devBody}
        </ScreenFrame>
      ) : (
        <div className="p-6 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to dark:from-background dark:via-background dark:to-background min-h-screen">{devBody}</div>
      )}
    </>
  );
}
