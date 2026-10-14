/**
 * Memory overview. VTID-05172 (Life Timeline P6): leads with this week's
 * Vitana Index story and the routines Vitana noticed (each forgettable), then
 * what Vitana knows and the memory categories. No mock data, no made-up
 * "last synced" time. Desktop Spotlight → ScreenFrame "collection"; phones
 * keep the app layout with the same content.
 */
import { useUrlTab } from "@/hooks/useUrlTab";
import { useState } from "react";
import { Plus } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { ScreenFrame } from "@/components/layout/spotlight";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { AddMemoryDialog } from "@/components/memory/AddMemoryDialog";
import { MemoryCategoryGrid } from "@/components/memory/MemoryCategoryGrid";
import { WhatVitanaKnows } from "@/components/memory/WhatVitanaKnows";
import { MemoryTimelineTab } from "@/components/memory/MemoryTimelineTab";
import { MemoryEducationTab } from "@/components/memory/MemoryEducationTab";
import { IndexWeekStory } from "@/components/memory/learning/IndexWeekStory";
import { RoutinesCard } from "@/components/memory/learning/RoutinesCard";
import { memoryNavigation } from "@/config/navigation";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { t } from "@/lib/i18n-toast";

const TABS = ["categories", "timeline", "education"] as const;

function Panes() {
  return (
    <>
      <SplitBarContent value="categories">
        <div className="mt-4 space-y-4" data-testid="memory-overview">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <IndexWeekStory />
            <RoutinesCard />
          </div>
          <WhatVitanaKnows />
          <MemoryCategoryGrid />
        </div>
      </SplitBarContent>
      <SplitBarContent value="timeline">
        <MemoryTimelineTab />
      </SplitBarContent>
      <SplitBarContent value="education">
        <MemoryEducationTab />
      </SplitBarContent>
    </>
  );
}

function tabLabel(v: (typeof TABS)[number]): string {
  return v === "categories" ? t("screens.memory.categories") : v === "timeline" ? t("screens.memory.timeline") : t("screens.memory.education");
}

export default withScreenId(function Memory() {
  const spotlight = useSpotlightEnabled();
  const [activeTab, setActiveTab] = useUrlTab("tab", "categories");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  const addButton = (
    <Button size="sm" onClick={() => setActionPopupOpen(true)}>
      <Plus className="me-2 h-4 w-4" aria-hidden />
      {t("screens.memory.addMemory")}
    </Button>
  );
  const seo = <SEO title={t("screens.memory.memoryHubVitana")} description={t("memoryLearning.header.overviewDescription")} />;
  const dialog = <AddMemoryDialog open={actionPopupOpen} onOpenChange={setActionPopupOpen} />;

  if (spotlight) {
    return (
      <AppLayout>
        {seo}
        <ScreenFrame
          archetype="collection"
          subNav={{ items: memoryNavigation }}
          header={{ title: t("screens.memory.memoryHub"), description: t("memoryLearning.header.overviewDescription"), emoji: "🧠" }}
          utility={{
            children: (
              <div className="flex min-w-max items-center gap-2.5">
                <ExpandableSearchButton placeholder={t("screens.memory.searchMemoriesInsightsTimeline")} />
                {addButton}
              </div>
            ),
          }}
          tabs={{ value: activeTab, onValueChange: setActiveTab, items: TABS.map((v) => ({ value: v, label: tabLabel(v) })) }}
        >
          <Panes />
        </ScreenFrame>
        {dialog}
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {seo}
      <SubNavigation items={memoryNavigation} />
      <div className="mx-auto w-full max-w-wide space-y-4 px-4 py-4 sm:px-6">
        <StandardHeader title={t("screens.memory.memoryHub")} description={t("memoryLearning.header.overviewDescription")} emoji="🧠" />
        <UtilityActionButton>
          <ExpandableSearchButton placeholder={t("screens.memory.searchMemoriesInsightsTimeline")} />
          <UniversalCalendarButton />
          {addButton}
        </UtilityActionButton>
        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
          <SplitBarList>
            {TABS.map((v) => (
              <SplitBarTrigger key={v} value={v}>{tabLabel(v)}</SplitBarTrigger>
            ))}
          </SplitBarList>
          <Panes />
        </SplitBar>
        {dialog}
      </div>
    </AppLayout>
  );
}, SCREEN_IDS.MEMORY_OVERVIEW);
