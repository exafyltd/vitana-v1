import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { ScrollText, Clock, Archive, Download } from "lucide-react";
import { devCommandNavigation } from "@/config/dev-navigation";

export default function CommandHistory() {
  const [activeTab, setActiveTab] = useState("logs");

  return (
    <>
      <SEO 
        title="Vitana DEV — Command History" 
        description="Browse the history of executed commands and their results"
        canonical={window.location.href}
      />

      <SubNavigation items={devCommandNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Command History"
            description="Browse the history of executed commands and their results"
            emoji="📜"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search history…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="logs">Execution Logs</SplitBarTrigger>
              <SplitBarTrigger value="timeline">Timeline</SplitBarTrigger>
              <SplitBarTrigger value="filtered">Filtered</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="logs" className="mt-6">
              <DevEmptyState 
                title="Execution Logs" 
                description="View detailed logs of all executed commands with status and output."
                icon={ScrollText}
              />
            </SplitBarContent>

            <SplitBarContent value="timeline" className="mt-6">
              <DevEmptyState 
                title="Timeline View" 
                description="Browse commands in chronological order with timestamps and duration."
                icon={Clock}
              />
            </SplitBarContent>

            <SplitBarContent value="filtered" className="mt-6">
              <DevEmptyState 
                title="Filtered History" 
                description="Filter command history by status, tenant, date range, or user."
                icon={Archive}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
