import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { MemoryMotivationalBanner } from "@/components/memory/MemoryMotivationalBanner";
import { MemoryMasterActionPopup } from "@/components/memory/MemoryMasterActionPopup";
import { SmartCalendarCard } from "@/components/crossover/SmartCalendarCard";
import { VitanaIndexCard } from "@/components/crossover/VitanaIndexCard";
import { TimelineContextCard } from "@/components/crossover/TimelineContextCard";
import { StandardCard } from "@/components/templates/StandardCard";
import { Brain, Clock, Archive, Mic, BookOpen, Calendar } from "lucide-react";

export default withScreenId(function Memory() {
  const [activeTab, setActiveTab] = useState("overview");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title="Memory | VITANA" description="Track your wellness journey through time and AI insights." />
      
      <SubNavigation items={memoryNavigation} />
      
      <div className="p-6">
        <StandardHeader 
          title="Your Health Memory"
          description="Track your wellness journey through time and AI insights."
          emoji="🧠"
        />

        <UtilityActionButton>
          <ExpandableSearchButton />
          <Button
            size="sm"
            onClick={() => setActionPopupOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Memory
          </Button>
        </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="overview" onClick={() => setActiveTab("overview")}>Overview</SplitBarTrigger>
              <SplitBarTrigger value="timeline" onClick={() => setActiveTab("timeline")}>Timeline</SplitBarTrigger>
              <SplitBarTrigger value="diary" onClick={() => setActiveTab("diary")}>Diary</SplitBarTrigger>
              <SplitBarTrigger value="recall" onClick={() => setActiveTab("recall")}>Recall</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="overview" hidden={activeTab !== "overview"}>
              {/* GRID ROW – Pattern 1: 6+3+3 */}
              <div className="grid grid-cols-12 gap-4 mb-6">
                <div className="col-span-12 md:col-span-6">
                  <TimelineContextCard />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard 
                    title="Memory Score"
                    subtitle="AI-Generated Insights"
                    icon={Brain}
                    content={
                      <div className="space-y-3">
                        <div className="text-2xl font-bold text-purple-600">94%</div>
                        <div className="text-sm text-muted-foreground">Wellness journey tracking accuracy</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard 
                    title="Total Memories"
                    subtitle="Captured Moments"
                    icon={Archive}
                    content={
                      <div className="space-y-3">
                        <div className="text-2xl font-bold text-indigo-600">1,247</div>
                        <div className="text-sm text-muted-foreground">Voice notes, photos & insights</div>
                      </div>
                    }
                  />
                </div>
              </div>

              <MemoryMotivationalBanner variant="overview" />

              {/* GRID ROW – Pattern 3: 12 */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <SmartCalendarCard />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="timeline" hidden={activeTab !== "timeline"}>
              {/* GRID ROW – Pattern 2: 3+3+6 */}
              <div className="grid grid-cols-12 gap-4 mb-6">
                <div className="col-span-12 md:col-span-3">
                  <StandardCard 
                    title="This Week"
                    subtitle="Recent Memories"
                    icon={Clock}
                    content={
                      <div className="space-y-3">
                        <div className="text-2xl font-bold text-blue-600">23</div>
                        <div className="text-sm text-muted-foreground">New entries added</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard 
                    title="Longest Streak"
                    subtitle="Consistency"
                    icon={Clock}
                    content={
                      <div className="space-y-3">
                        <div className="text-2xl font-bold text-green-600">47</div>
                        <div className="text-sm text-muted-foreground">Days of daily logging</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <VitanaIndexCard />
                </div>
              </div>

              <MemoryMotivationalBanner variant="timeline" />
            </SplitBarContent>

            <SplitBarContent value="diary" hidden={activeTab !== "diary"}>
              <div className="grid grid-cols-12 gap-4 mb-6">
                <div className="col-span-12 md:col-span-6">
                  <StandardCard 
                    title="Voice Entries"
                    subtitle="Spoken Memories"
                    icon={Mic}
                    content={
                      <div className="space-y-3">
                        <div className="text-2xl font-bold text-green-600">342</div>
                        <div className="text-sm text-muted-foreground">Total voice recordings</div>
                        <div className="text-xs text-muted-foreground">Last: 2 hours ago</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard 
                    title="Written Notes"
                    subtitle="Text Entries"
                    icon={BookOpen}
                    content={
                      <div className="space-y-3">
                        <div className="text-2xl font-bold text-blue-600">156</div>
                        <div className="text-sm text-muted-foreground">Total written entries</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard 
                    title="This Month"
                    subtitle="Recent Activity"
                    icon={Calendar}
                    content={
                      <div className="space-y-3">
                        <div className="text-2xl font-bold text-purple-600">89</div>
                        <div className="text-sm text-muted-foreground">New diary entries</div>
                      </div>
                    }
                  />
                </div>
              </div>

              <MemoryMotivationalBanner variant="diary" />
            </SplitBarContent>

            <SplitBarContent value="recall" hidden={activeTab !== "recall"}>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <StandardCard 
                    title="Memory Search & Recall"
                    subtitle="AI-Powered Memory Retrieval"
                    icon={Brain}
                    content={
                      <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                          Search through your entire wellness journey using natural language.
                          Find specific moments, patterns, and insights from your health memory.
                        </div>
                        <div className="flex gap-4 text-sm">
                          <div>
                            <div className="font-medium text-orange-600">Fast Search</div>
                            <div className="text-muted-foreground">Instant results</div>
                          </div>
                          <div>
                            <div className="font-medium text-blue-600">Pattern Detection</div>
                            <div className="text-muted-foreground">AI insights</div>
                          </div>
                          <div>
                            <div className="font-medium text-green-600">Smart Filters</div>
                            <div className="text-muted-foreground">Precise results</div>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>

              <MemoryMotivationalBanner variant="recall" />
            </SplitBarContent>
          </SplitBar>

          <MemoryMasterActionPopup
            open={actionPopupOpen}
            onOpenChange={setActionPopupOpen}
          />
        </div>
    </AppLayout>
  );
}, SCREEN_IDS.MEMORY_OVERVIEW);