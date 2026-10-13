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
import { Plus, FileText, Tag } from "lucide-react";
import { devVTIDNavigation } from "@/config/dev-navigation";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";

export default function VTIDIssue() {
  const spotlight = useSpotlightEnabled();
  const [activeTab, setActiveTab] = useState("form");

  const devBody = (
    <>
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="VTID Issuance"
            description="Issue new VTIDs and manage VTID creation (read-only in Phase 1)"
            emoji="🎫"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search recent issuances…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm" disabled>
              <Plus className="w-4 h-4 me-2" />
              Issue VTID
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-surface-raised/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="form">Issuance Form</SplitBarTrigger>
              <SplitBarTrigger value="recent">Recent Issuances</SplitBarTrigger>
              <SplitBarTrigger value="rules">Validation Rules</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="form" className="mt-6">
              <DevEmptyState 
                title="Issuance Form" 
                description="Create new VTID entries (form disabled in read-only mode)."
                icon={Plus}
              />
            </SplitBarContent>

            <SplitBarContent value="recent" className="mt-6">
              <DevEmptyState 
                title="Recent Issuances" 
                description="View recently issued VTIDs and their metadata."
                icon={FileText}
              />
            </SplitBarContent>

            <SplitBarContent value="rules" className="mt-6">
              <DevEmptyState 
                title="Validation Rules" 
                description="Review VTID validation rules and issuance policies."
                icon={Tag}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
    </>
  );

  return (
    <>
      <SEO 
        title="Vitana DEV — VTID Issuance" 
        description="Issue new VTIDs and manage VTID creation"
        canonical={window.location.href}
      />

      <SubNavigation items={devVTIDNavigation} />

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
