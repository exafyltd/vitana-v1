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
import { Search, Filter, Database } from "lucide-react";
import { devVTIDNavigation } from "@/config/dev-navigation";

export default function VTIDSearch() {
  const [activeTab, setActiveTab] = useState("search");

  return (
    <>
      <SEO 
        title="Vitana DEV — VTID Search" 
        description="Search and lookup VTIDs across the platform"
        canonical={window.location.href}
      />

      <SubNavigation items={devVTIDNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="VTID Search"
            description="Search and lookup VTIDs across the platform"
            emoji="🔍"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search VTIDs…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="search">Search Interface</SplitBarTrigger>
              <SplitBarTrigger value="recent">Recent Searches</SplitBarTrigger>
              <SplitBarTrigger value="details">VTID Details</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="search" className="mt-6">
              <DevEmptyState 
                title="Search Interface" 
                description="Search for VTIDs by ID, tenant, metadata, or date range."
                icon={Search}
              />
            </SplitBarContent>

            <SplitBarContent value="recent" className="mt-6">
              <DevEmptyState 
                title="Recent Searches" 
                description="View your recent VTID search history and saved queries."
                icon={Filter}
              />
            </SplitBarContent>

            <SplitBarContent value="details" className="mt-6">
              <DevEmptyState 
                title="VTID Details View" 
                description="Inspect detailed VTID metadata and associated records."
                icon={Database}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
