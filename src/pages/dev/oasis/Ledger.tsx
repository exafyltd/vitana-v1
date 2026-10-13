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
import { Book, ScrollText, Archive, Filter } from "lucide-react";
import { devOasisNavigation } from "@/config/dev-navigation";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";

export default function OasisLedger() {
  const spotlight = useSpotlightEnabled();
  const [activeTab, setActiveTab] = useState("transactions");

  const devBody = (
    <>
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="OASIS Ledger"
            description="Event ledger and transaction history"
            emoji="📖"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search ledger…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm">
              <Filter className="w-4 h-4 me-2" />
              Filter Events
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-surface-raised/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="transactions">Transaction Logs</SplitBarTrigger>
              <SplitBarTrigger value="viewer">Ledger Viewer</SplitBarTrigger>
              <SplitBarTrigger value="audit">Audit Trail</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="transactions" className="mt-6">
              <DevEmptyState 
                title="Transaction Logs" 
                description="View all OASIS transaction logs with event details."
                icon={Book}
              />
            </SplitBarContent>

            <SplitBarContent value="viewer" className="mt-6">
              <DevEmptyState 
                title="Ledger Viewer" 
                description="Browse the complete OASIS event ledger chronologically."
                icon={ScrollText}
              />
            </SplitBarContent>

            <SplitBarContent value="audit" className="mt-6">
              <DevEmptyState 
                title="Audit Trail" 
                description="Track auditable events and compliance records."
                icon={Archive}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
    </>
  );

  return (
    <>
      <SEO 
        title="Vitana DEV — OASIS Ledger" 
        description="Event ledger and transaction history"
        canonical={window.location.href}
      />

      <SubNavigation items={devOasisNavigation} />

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
