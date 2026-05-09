import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, RotateCcw, Repeat, Lightbulb, CheckCircle, Play, Pause, Settings, Clock, AlertTriangle, Filter, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import { useNavigate } from "react-router-dom";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";
import { homeNavigation } from "@/config/navigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Search, Plus } from "lucide-react";
import { AddToAIFeedPopup } from "@/components/AddToAIFeedPopup";
import { Input } from "@/components/ui/input";

// Import new visual components
import { VisualActivityFeed } from "@/components/ai-feed/VisualActivityFeed";
import { VisualRoutinesGrid } from "@/components/ai-feed/VisualRoutinesGrid";
import { GlowingSuggestionsGrid } from "@/components/ai-feed/GlowingSuggestionsGrid";
import { VisualHistoryTimeline } from "@/components/ai-feed/VisualHistoryTimeline";
import { MotivationalBanner } from "@/components/ai-feed/MotivationalBanner";

// Import unified horizontal list components
import { HorizontalCardList } from "@/components/ui/horizontal-card-list";
import { transformActivityToVisualCard, transformRoutineToVisualCard } from "@/lib/ai-feed-transformers";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { StandardHorizontalCardProps } from "@/components/ui/standard-horizontal-card";
import { VisualHorizontalCardProps } from "@/components/ui/visual-horizontal-card";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { useToast } from '@/hooks/use-toast';
import { notify, t } from '@/lib/i18n-toast';

export default function AIFeed() {
  const navigate = useNavigate();
  const { state, executeActions } = useAutopilot();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [addToFeedOpen, setAddToFeedOpen] = useState(false);
  const [savedActivityIds, setSavedActivityIds] = useState<Map<string, string>>(new Map());
  const { createKnowledge, deleteKnowledge } = useKnowledgeBase();
  const { toast } = useToast();
  
  // Mock activity feed data including completed/failed actions
  const activityFeed = [
    ...state.actions
      .filter(action => action.status !== "pending")
      .map(action => ({
        id: action.id,
        type: "action" as const,
        title: action.title,
        reason: action.reason,
        timestamp: action.timestamp,
        status: action.status,
        icon: action.icon,
        category: action.category
      })),
    {
      id: "routine-1",
      type: "routine" as const,
      title: "Hydration reminder triggered",
      reason: "2 hours since last water intake",
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      status: "completed" as const,
      icon: "💧",
      category: "health" as const
    },
    {
      id: "suggestion-1", 
      type: "suggestion" as const,
      title: "Morning routine optimization suggested",
      reason: "Detected 8 AM energy peak pattern",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: "pending" as const,
      icon: "🌅",
      category: "health" as const
    }
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const filteredFeed = selectedFilter === "autopilot-history" 
    ? activityFeed.filter(item => item.type === "action" && item.status === "completed")
    : activityFeed;

  // Transform activities to standard cards if unified lists are enabled
  const transformedActivities: StandardHorizontalCardProps[] = filteredFeed.map((activity) => {
    const card = transformActivityToVisualCard(activity as any);
    const activityId = (activity as any).id;
    const isSaved = savedActivityIds.has(activityId);
    
    return {
      ...card,
      primaryAction: {
        ...card.primaryAction,
        label: isSaved ? "✓ Saved" : card.primaryAction.label,
        variant: isSaved ? "ghost" : card.primaryAction.variant,
        onClick: async () => {
          if (isSaved) {
            // Unsave: remove from knowledge base
            const knowledgeId = savedActivityIds.get(activityId);
            if (knowledgeId) {
              deleteKnowledge({ id: knowledgeId, source: "ai" });
              setSavedActivityIds(prev => {
                const newMap = new Map(prev);
                newMap.delete(activityId);
                return newMap;
              });
              notify('toasts.home.removedFromMemory', 'toasts.home.activityHasRemovedFromYourKnowledge');
            }
          } else {
            // Save: create knowledge item with metadata
            console.log("[AI Feed] Saving activity to memory:", activityId);
            createKnowledge(
              {
                source: "ai",
                content: `${(activity as any).title} — ${(activity as any).reason}`,
                memoryType: "insight",
                confidenceScore: 0.85,
                metadata: {
                  sourceActivityId: activityId,
                  sourceScreen: "ai-feed"
                }
              },
              {
                onSuccess: (data: any) => {
                  if (data?.id) {
                    setSavedActivityIds(prev => new Map(prev).set(activityId, data.id));
                  }
                  notify('toasts.home.savedMemory', 'toasts.home.activityHasSavedYourKnowledgeBase');
                }
              }
            );
          }
        },
      },
    };
  });
  const useUnifiedLists = isFeatureEnabled('enableUnifiedHorizontalLists');

  return (
    <AppLayout>
      <SEO title={t('screens.home.aiFeedDashboard')} description="AI Feed & Automations" canonical={window.location.href} />
      <SubNavigation items={homeNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <div className="max-w-7xl xl:max-w-[1480px] 2xl:max-w-[1600px] mx-auto px-6">
          <StandardHeader
            title={t('screens.home.aiFeedAutomations')}
            description="The magic window – where Autopilot shows its work."
            emoji="⚡"
            className="mb-4 xl:mb-3"
          />

          {/* Action Buttons */}
          <UtilityActionButton className="mb-6">
            <ExpandableSearchButton 
              placeholder={t('screens.home.searchFeedRoutinesIdeasHistory')}
              onSearch={(query) => console.log('Search AI Feed:', query)}
            />
            <UniversalCalendarButton />
            <Button variant="default" size="sm" onClick={() => setAddToFeedOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('screens.home.feed')}
            </Button>
          </UtilityActionButton>

          {/* Split-Screen Navigation */}
          <SplitBar defaultValue="feed" className="w-full">
            <SplitBarList className="grid w-full grid-cols-4">
              <SplitBarTrigger value="feed">{t('screens.home.feed')}</SplitBarTrigger>
              <SplitBarTrigger value="routines">{t('screens.home.routines')}</SplitBarTrigger>
              <SplitBarTrigger value="ideas">{t('screens.home.ideas')}</SplitBarTrigger>
              <SplitBarTrigger value="history">{t('screens.home.history')}</SplitBarTrigger>
            </SplitBarList>

            {/* Activity Feed Tab */}
            <SplitBarContent value="feed">
              <div className="space-y-6 pb-8">
                <MotivationalBanner 
                  variant="learning" 
                  userName="Jovana"
                  className="mb-4"
                />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-yellow-600 animate-pulse" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">{t('screens.home.activityFeed')}</h2>
                        <p className="text-sm text-muted-foreground">{t('screens.home.realtimeAiActionsInsights')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={selectedFilter === "autopilot-history" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedFilter(selectedFilter === "autopilot-history" ? "all" : "autopilot-history")}
                        className="h-9"
                      >
                        <History className="w-4 h-4 mr-1" />
                        {t('screens.home.autopilotHistory')}
                      </Button>
                      <Badge variant="outline">{t('screens.home.live')}</Badge>
                    </div>
                  </div>

                  {useUnifiedLists ? (
                    <HorizontalCardList
                      items={transformedActivities}
                      variant="standard"
                      groupBy="date"
                      screenId="AI_FEED_ACTIVITY"
                      listId="ai-feed-activity"
                      gap="sm"
                      className="pb-4"
                    />
                  ) : (
                    <VisualActivityFeed activities={filteredFeed} />
                  )}
                </div>
              </div>
            </SplitBarContent>

            {/* My Routines Tab */}
            <SplitBarContent value="routines">
              <div className="space-y-6 pb-8">
                <MotivationalBanner 
                  variant="celebrating" 
                  userName="Jovana"
                  className="mb-4"
                />
                
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                        <Repeat className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">{t('screens.home.myRoutines')}</h2>
                        <p className="text-sm text-muted-foreground">{t('screens.home.automatedHabitsBuildingYourBestSelf')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-9 bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30">
                        <Pause className="w-4 h-4 mr-1" />{t('screens.home.pauseAll')}
                      </Button>
                      <Button variant="outline" size="sm" className="h-9 bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30">
                        <Settings className="w-4 h-4 mr-1" />{t('screens.home.edit')}
                      </Button>
                      <Button size="sm" className="h-9 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                        <Play className="w-4 h-4 mr-1" />{t('screens.home.runNow')}
                      </Button>
                    </div>
                  </div>

                  {useUnifiedLists ? (
                    <HorizontalCardList
                      items={[]} // Will be populated with routine data
                      variant="visual"
                      groupBy="none"
                      screenId="AI_FEED_ROUTINES"
                      listId="ai-feed-routines"
                      gap="sm"
                      className="pb-4"
                      emptyState={
                        <div className="text-center py-8 text-muted-foreground">{t('screens.home.noRoutinesYetCreateYourFirst')}
                        </div>
                      }
                    />
                  ) : (
                    <VisualRoutinesGrid 
                      onToggleRoutine={(routineId) => console.log('Toggle routine:', routineId)}
                    />
                  )}
                </div>
              </div>
            </SplitBarContent>

            {/* AI Ideas Tab */}
            <SplitBarContent value="ideas">
              <div className="space-y-6 pb-8">
                <MotivationalBanner 
                  variant="adapting" 
                  userName="Jovana"
                  className="mb-4"
                />
                
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center">
                        <Lightbulb className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">{t('screens.home.aiIdeas')}</h2>
                        <p className="text-sm text-muted-foreground">{t('screens.home.experimentalSuggestionsFromYourAiCompanion')}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                      <Lightbulb className="w-3 h-3 mr-1" />{t('screens.home.text4NewIdeas')}
                    </Badge>
                  </div>

                  <GlowingSuggestionsGrid 
                    onTrySuggestion={(suggestionId) => console.log('Try suggestion:', suggestionId)}
                    onDismissSuggestion={(suggestionId) => console.log('Dismiss suggestion:', suggestionId)}
                  />
                </div>
              </div>
            </SplitBarContent>

            {/* History Tab */}
            <SplitBarContent value="history">
              <div className="space-y-6 pb-8">
                <MotivationalBanner 
                  variant="encouraging" 
                  userName="Jovana"
                  className="mb-4"
                />
                
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-500/20 to-slate-500/20 flex items-center justify-center">
                        <History className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">{t('screens.home.yourJourney')}</h2>
                        <p className="text-sm text-muted-foreground">{t('screens.home.milestonesAchievementsGrowthOverTime')}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="h-9 bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30">
                      <RotateCcw className="w-4 h-4 mr-1" />
                      {t('screens.home.exportHistory')}
                    </Button>
                  </div>

                  <VisualHistoryTimeline />
                </div>
              </div>
            </SplitBarContent>
          </SplitBar>

          {/* Autopilot Status Bar */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 mt-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-yellow-600 animate-pulse" />
                    <span className="font-medium">{t('screens.home.autopilotStatus')}</span>
                    <Badge variant="default">{t('screens.home.active')}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('screens.home.centralFeedEverythingAiDoesFeels')}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-1" />
                  {t('screens.home.configure')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add to AI Feed Popup */}
      <AddToAIFeedPopup 
        open={addToFeedOpen} 
        onOpenChange={setAddToFeedOpen}
      />
    </AppLayout>
  );
}