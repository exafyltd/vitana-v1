import { useState, useRef, useEffect } from "react";
import { Plus, Loader2, Calendar as CalendarIcon, RefreshCw, MessageSquare, Activity, Trash2, Sparkles, Brain, Mic } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { HistoryMasterActionPopup } from "@/components/memory/HistoryMasterActionPopup";
import { PromoteToKnowledgeDialog } from "@/components/memory/PromoteToKnowledgeDialog";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { useActivityHistory } from "@/hooks/useActivityHistory";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HorizontalCardList } from "@/components/ui/horizontal-card-list";
import { StandardHorizontalCardProps } from "@/components/ui/standard-horizontal-card";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { t } from '@/lib/i18n-toast';

// Category configuration
const CATEGORIES = [
  { filter: "chat", emoji: "💬", label: "Chat" },
  { filter: "memory", emoji: "🧠", label: "Memory" },
  { filter: "wallet", emoji: "💰", label: "Wallet" },
  { filter: "discover", emoji: "❤️", label: "Discover" },
  { filter: "calendar", emoji: "📅", label: "Calendar" },
  { filter: "autopilot", emoji: "🤖", label: "Autopilot" },
  { filter: "health", emoji: "🩺", label: "Health" },
  { filter: "community", emoji: "👥", label: "Community" },
];

function Timeline() {
  const [actionPopupOpen, setActionPopupOpen] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [promotingActivity, setPromotingActivity] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"all" | "by-category">("all");
  const [expandedCategory, setExpandedCategory] = useState<string | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { translate } = useTranslation();
  
  const allLoadMoreRef = useRef<HTMLDivElement>(null);

  // "All" tab - fetches all activities
  const {
    allItems: allActivityItems,
    conversationExchanges: allConversations,
    logActivities: allLogActivities,
    fetchNextPage: fetchNextAll,
    hasNextPage: hasNextAll,
    isFetchingNextPage: isFetchingNextAll,
    isLoading: isLoadingAll,
    deleteActivity,
    refetch,
  } = useActivityHistory("all");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Category-specific hooks - only active when in "By Category" tab
  const chatData = useActivityHistory("chat");
  const memoryData = useActivityHistory("memory");
  const walletData = useActivityHistory("wallet");
  const discoverData = useActivityHistory("discover");
  const calendarData = useActivityHistory("calendar");
  const autopilotData = useActivityHistory("autopilot");
  const healthData = useActivityHistory("health");
  const communityData = useActivityHistory("community");

  const categoryHooks: Record<string, ReturnType<typeof useActivityHistory>> = {
    chat: chatData,
    memory: memoryData,
    wallet: walletData,
    discover: discoverData,
    calendar: calendarData,
    autopilot: autopilotData,
    health: healthData,
    community: communityData,
  };

  // Infinite scroll for "All" tab
  useEffect(() => {
    if (activeTab !== "all") return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextAll && !isFetchingNextAll) {
          fetchNextAll();
        }
      },
      { threshold: 0.5 }
    );

    if (allLoadMoreRef.current) {
      observer.observe(allLoadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [activeTab, hasNextAll, isFetchingNextAll, fetchNextAll]);

  // Auto-expand most recent category on first load
  useEffect(() => {
    if (activeTab === "by-category" && expandedCategory === undefined) {
      const mostRecent = getMostRecentCategory();
      setExpandedCategory(mostRecent || "");
    }
  }, [activeTab, expandedCategory]);

  const getMostRecentCategory = () => {
    let mostRecentDate = new Date(0);
    let mostRecentCategory = "";

    CATEGORIES.forEach(({ filter }) => {
      const hookData = categoryHooks[filter];
      if (hookData && hookData.allItems.length > 0) {
        const latestItem = hookData.allItems[0];
        const itemDate = new Date(latestItem.createdAt);
        if (itemDate > mostRecentDate) {
          mostRecentDate = itemDate;
          mostRecentCategory = filter;
        }
      }
    });

    return mostRecentCategory;
  };

  const getCountLast30Days = (items: any[]) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return items.filter(item => new Date(item.createdAt) >= thirtyDaysAgo).length;
  };

  const getLatestTimestamp = (items: any[]) => {
    if (items.length === 0) return null;
    return new Date(items[0].createdAt);
  };

  const handlePromoteToKnowledge = (itemId: string) => {
    // Check if it's an exchange or activity
    const exchange = allConversations.find((ex) => ex.id === itemId);
    const activity = allLogActivities.find((a) => a.id === itemId);
    
    if (exchange) {
      setPromotingActivity(exchange.userMessage);
      setPromoteDialogOpen(true);
    } else if (activity) {
      setPromotingActivity(activity);
      setPromoteDialogOpen(true);
    }
  };

  const handleDeleteActivity = (itemId: string, type: 'conversation' | 'activity') => {
    deleteActivity({ id: itemId, type });
  };

  // Get accent color based on activity category
  const getAccentColorForCategory = (category: string): string => {
    const colorMap: Record<string, string> = {
      chat: 'hsl(var(--pill-chat-accent))',
      memory: 'hsl(var(--pill-memory-accent))',
      wallet: 'hsl(var(--pill-wallet-accent))',
      discover: 'hsl(var(--pill-discover-accent))',
      calendar: 'hsl(var(--pill-calendar-accent))',
      autopilot: 'hsl(var(--sys-ai-accent))',
      health: 'hsl(var(--pill-health-accent))',
      community: 'hsl(var(--pill-community-accent))',
    };
    return colorMap[category] || 'hsl(var(--primary))';
  };

  // Get icon for activity type
  const getActivityIcon = (activityType: string, category: string) => {
    if (activityType === 'conversation') {
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
      );
    }
    
    const iconMap: Record<string, JSX.Element> = {
      chat: <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      memory: <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
      calendar: <CalendarIcon className="w-4 h-4 text-green-600 dark:text-green-400" />,
    };
    
    const icon = iconMap[category] || <Activity className="w-4 h-4" />;
    
    return (
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        {icon}
      </div>
    );
  };

  // Transform activity to horizontal card props
  const transformActivityToHorizontalCard = (item: any): StandardHorizontalCardProps => {
    const isConversation = item.itemType === 'exchange';
    const category = item.category || 'activity';
    
    return {
      id: item.id,
      screenId: SCREEN_IDS.MEMORY_TIMELINE,
      icon: getActivityIcon(isConversation ? 'conversation' : item.activityType, category),
      title: isConversation 
        ? "Conversation Exchange"
        : item.activityType?.replace(/_/g, ' ').replace(/\./g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || "Activity",
      description: isConversation 
        ? item.userMessage?.content || "No content"
        : item.activityData?.description || item.activityData?.content || "Activity logged",
      badges: [
        { 
          label: category.charAt(0).toUpperCase() + category.slice(1), 
          variant: 'secondary' as const 
        }
      ],
      metadata: [
        ...(item.activityData?.isVoiceInput ? [{
          icon: <Mic className="w-3.5 h-3.5 text-purple-500" />,
          text: "Voice input"
        }] : [])
      ],
      timestamp: new Date(item.createdAt),
      primaryAction: {
        label: 'View Details',
        onClick: () => console.log('View details:', item.id),
        variant: 'outline' as const,
      },
      secondaryActions: [
        {
          label: 'Save to Knowledge',
          onClick: () => handlePromoteToKnowledge(item.id),
          icon: <Sparkles className="w-3 h-3 mr-1" />
        },
        { 
          label: 'Delete', 
          onClick: () => handleDeleteActivity(item.id, isConversation ? 'conversation' : 'activity'), 
          icon: <Trash2 className="w-3 h-3 mr-1" /> 
        }
      ],
      expandedContent: isConversation ? (
        <div className="space-y-3 transition-opacity duration-150">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">{t('screens.memory.you')}</div>
            <div className="text-sm text-foreground">{item.userMessage?.content}</div>
          </div>
          <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
            <div className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">{t('screens.memory.aiAssistant')}</div>
            <div className="text-sm text-foreground">{item.aiMessage?.content}</div>
          </div>
        </div>
      ) : item.activityData ? (
        <div className="space-y-2 transition-opacity duration-150">
          <div className="text-sm text-muted-foreground">
            {JSON.stringify(item.activityData, null, 2).slice(0, 200)}...
          </div>
        </div>
      ) : undefined,
      expandOnPrimaryClick: true,
      density: 'compact' as const,
      accentColor: getAccentColorForCategory(category)
    };
  };

  // Hide deletion log entries from the activity view
  const allItems = allActivityItems.filter((i: any) => {
    if (i.itemType === 'activity') {
      return i.activityType !== 'memory.delete';
    }
    return true;
  });

  // Transform items for horizontal cards
  const transformedAllItems: StandardHorizontalCardProps[] = allItems.map(transformActivityToHorizontalCard);

  return (
    <AppLayout>
      <SEO 
        title={t('screens.memory.activityTimelineVitana')} 
        description="Track your activity history across all system interactions in chronological order." 
      />
      <SubNavigation items={memoryNavigation} />
      
      <div className="p-6">
        <div className="max-w-7xl xl:max-w-[1480px] 2xl:max-w-[1600px] mx-auto px-6">
        <StandardHeader 
          title={t('screens.memory.activityTimeline')}
          description="Track your activity history across all system interactions"
          emoji="📜"
          className="mb-4 xl:mb-3"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder={translate('timeline.searchPlaceholder', 'Search activity...')} />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setActionPopupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('screens.memory.manageHistory')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title={t('screens.memory.refreshTimeline')}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </UtilityActionButton>

        {/* Tabs for All and By Category */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "by-category")} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all" className="flex items-center gap-2">
              {t('screens.memory.all')}
            </TabsTrigger>
            <TabsTrigger value="by-category" className="flex items-center gap-2">
              {t('screens.memory.byCategory')}
            </TabsTrigger>
          </TabsList>

          {/* All Tab */}
          <TabsContent value="all" className="mt-6">
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                📜 <strong>{t('screens.memory.activityHistory')}</strong>{t('screens.memory.readonlyChronologicalRecordYourSystemUsage')}
              </p>
            </div>

            <HorizontalCardList
              items={transformedAllItems}
              variant="standard"
              groupBy="date"
              screenId={SCREEN_IDS.MEMORY_TIMELINE}
              listId="timeline-all"
              infiniteScroll={true}
              onLoadMore={fetchNextAll}
              hasMore={hasNextAll}
              isLoading={isFetchingNextAll || isLoadingAll}
              gap="sm"
              className="pb-4"
              emptyState={
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground mb-3">
                      {t('screens.memory.noActivityHistoryYetStartUsing')}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setActionPopupOpen(true)}>
                      {t('screens.memory.addMemory')}
                    </Button>
                  </CardContent>
                </Card>
              }
            />
          </TabsContent>

          {/* By Category Tab */}
          <TabsContent value="by-category" className="mt-6">
            <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                📊 <strong>{t('screens.memory.byCategory')}</strong>{t('screens.memory.browseYourActivityOrganizedBySystem')}
              </p>
            </div>

            <div>
              {/* Horizontal Category Menu */}
              <div className="overflow-x-auto pb-4 mb-6">
                <div className="flex gap-3 min-w-max">
                  {CATEGORIES.map((category) => {
                    const hookData = categoryHooks[category.filter];
                    const items = hookData?.allItems.filter((i: any) => {
                      if (i.itemType === 'activity') {
                        return i.activityType !== 'memory.delete';
                      }
                      return true;
                    }) || [];
                    const count = getCountLast30Days(items);
                    const latestTimestamp = getLatestTimestamp(items);
                    const isActive = expandedCategory === category.filter;

                    return (
                      <Button
                        key={category.filter}
                        variant={isActive ? "default" : "outline"}
                        className="flex-shrink-0 h-auto py-2 px-3 flex flex-row items-center gap-2 min-w-fit"
                        onClick={() => setExpandedCategory(category.filter)}
                      >
                        <span className="text-base">{category.emoji}</span>
                        <span className="font-medium text-sm whitespace-nowrap">{category.label}</span>
                        <Badge variant={isActive ? "secondary" : "outline"} className="text-xs ml-1">
                          {count}
                        </Badge>
                      </Button>
                    );
                  })}
        </div>
        </div>
      </div>

              {/* Selected Category Content */}
              {expandedCategory && (() => {
                const category = CATEGORIES.find(c => c.filter === expandedCategory);
                if (!category) return null;

                const hookData = categoryHooks[category.filter];
                const items = hookData?.allItems.filter((i: any) => {
                  if (i.itemType === 'activity') {
                    return i.activityType !== 'memory.delete';
                  }
                  return true;
                }) || [];
                const isLoading = hookData?.isLoading;
                const hasNext = hookData?.hasNextPage;
                const isFetchingNext = hookData?.isFetchingNextPage;

                const transformedCategoryItems: StandardHorizontalCardProps[] = items.map(transformActivityToHorizontalCard);

                return (
                  <div className="pt-4">
                    <HorizontalCardList
                      items={transformedCategoryItems}
                      variant="standard"
                      groupBy="date"
                      screenId={SCREEN_IDS.MEMORY_TIMELINE}
                      listId={`timeline-${category.filter}`}
                      infiniteScroll={true}
                      onLoadMore={() => hookData?.fetchNextPage()}
                      hasMore={hasNext}
                      isLoading={isFetchingNext || isLoading}
                      gap="sm"
                      className="pb-4"
                      emptyState={
                        <Card className="border-dashed">
                          <CardContent className="p-8 text-center">
                            <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                            <p className="text-muted-foreground mb-3">{t('screens.memory.noLabelActivityYet', { label: category.label })}
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setActiveTab("all")}
                            >
                              {t('screens.memory.viewAllActivity')}
                            </Button>
                          </CardContent>
                        </Card>
                      }
                    />
                  </div>
                );
              })()}
            </TabsContent>
        </Tabs>

        <HistoryMasterActionPopup 
          open={actionPopupOpen}
          onOpenChange={setActionPopupOpen}
        />

        <PromoteToKnowledgeDialog
          activity={promotingActivity}
          open={promoteDialogOpen}
          onOpenChange={setPromoteDialogOpen}
        />
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Timeline, SCREEN_IDS.MEMORY_TIMELINE);
