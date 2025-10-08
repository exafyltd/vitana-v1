import { useState, useRef, useEffect } from "react";
import { Plus, Loader2, Calendar as CalendarIcon, LayoutList, Grid3x3, RefreshCw } from "lucide-react";
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
import { ActivityCard } from "@/components/memory/ActivityCard";
import { ConversationCard } from "@/components/memory/ConversationCard";
import { PromoteToKnowledgeDialog } from "@/components/memory/PromoteToKnowledgeDialog";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { useActivityHistory } from "@/hooks/useActivityHistory";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const groupItemsByDate = (items: any[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: Record<string, any[]> = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      Older: [],
    };

    items.forEach((item) => {
      const itemDate = new Date(item.createdAt);
      const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

      if (itemDay.getTime() === today.getTime()) {
        groups.Today.push(item);
      } else if (itemDay.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(item);
      } else if (itemDate >= weekAgo) {
        groups["This Week"].push(item);
      } else {
        groups.Older.push(item);
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach((key) => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  };

  // Hide deletion log entries from the activity view
  const allItems = allActivityItems.filter((i: any) => {
    if (i.itemType === 'activity') {
      return i.activityType !== 'memory.delete';
    }
    return true;
  });

  const renderActivityList = (items: any[], loadMoreRef?: React.RefObject<HTMLDivElement>, hasNext?: boolean, isFetchingNext?: boolean) => {
    const groupedItems = groupItemsByDate(items);
    
    return (
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([dateGroup, dateItems]) => (
          <div key={dateGroup} className="space-y-3">
            <h3 className="sticky top-0 bg-background z-10 py-2 font-semibold text-sm text-muted-foreground border-b">
              {dateGroup}
            </h3>
            {dateItems.map((item) => (
              item.itemType === 'exchange' ? (
                <ConversationCard
                  key={item.id}
                  exchange={item}
                  onPromote={handlePromoteToKnowledge}
                  onDelete={handleDeleteActivity}
                />
              ) : (
                <ActivityCard 
                  key={item.id} 
                  activity={item}
                  onPromote={handlePromoteToKnowledge}
                  onDelete={handleDeleteActivity}
                />
              )
            ))}
          </div>
        ))}

        {loadMoreRef && hasNext && (
          <div ref={loadMoreRef} className="py-8 flex justify-center">
            {isFetchingNext && (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            )}
          </div>
        )}

        {loadMoreRef && !hasNext && items.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            You've reached the beginning of your activity history 📜
          </p>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <SEO 
        title="Activity Timeline | VITANA" 
        description="Track your activity history across all system interactions in chronological order." 
      />
      <SubNavigation items={memoryNavigation} />
      
      <div className="p-6">
        <StandardHeader 
          title="Activity Timeline"
          description="Track your activity history across all system interactions"
          emoji="📜"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder="Search activity..." />
          <UniversalCalendarButton />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh timeline"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setActionPopupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Manage History
          </Button>
        </UtilityActionButton>

        {/* Tabs for All and By Category */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "by-category")} className="mt-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <LayoutList className="w-4 h-4" />
              All
            </TabsTrigger>
            <TabsTrigger value="by-category" className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4" />
              By Category
            </TabsTrigger>
          </TabsList>

          {/* All Tab */}
          <TabsContent value="all" className="mt-6">
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                📜 <strong>Activity History:</strong> A read-only chronological record of your system usage. This data is NOT used by AI for context.
              </p>
            </div>

            <div className="max-w-7xl mx-auto">
              {isLoadingAll ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : allItems.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground mb-3">
                      No activity history yet. Start using the system to see your activity!
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setActionPopupOpen(true)}>
                      Add Memory
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                renderActivityList(allItems, allLoadMoreRef, hasNextAll, isFetchingNextAll)
              )}
            </div>
          </TabsContent>

          {/* By Category Tab */}
          <TabsContent value="by-category" className="mt-6">
            <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                📊 <strong>By Category:</strong> Browse your activity organized by system area. Expand any section to view details.
              </p>
            </div>

            <div className="max-w-7xl mx-auto">
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
                        className="flex-shrink-0 h-auto py-3 px-4 flex flex-col items-start gap-1 min-w-[140px]"
                        onClick={() => setExpandedCategory(category.filter)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-lg">{category.emoji}</span>
                          <span className="font-medium text-sm">{category.label}</span>
                        </div>
                        <div className="flex items-center gap-2 w-full justify-between">
                          <Badge variant={isActive ? "secondary" : "outline"} className="text-xs">
                            {count}
                          </Badge>
                          {latestTimestamp && (
                            <span className="text-xs opacity-70">
                              {formatDistanceToNow(latestTimestamp, { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </Button>
                    );
                  })}
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

                return (
                  <div className="pt-4">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : items.length === 0 ? (
                      <Card className="border-dashed">
                        <CardContent className="p-8 text-center">
                          <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                          <p className="text-muted-foreground mb-3">
                            No {category.label} activity yet
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setActiveTab("all")}
                          >
                            View All Activity
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(groupItemsByDate(items)).map(([dateGroup, dateItems]) => (
                          <div key={dateGroup} className="space-y-3">
                            <h3 className="sticky top-0 bg-background z-10 py-2 font-semibold text-sm text-muted-foreground border-b">
                              {dateGroup}
                            </h3>
                            {dateItems.map((item) => (
                              item.itemType === 'exchange' ? (
                                <ConversationCard
                                  key={item.id}
                                  exchange={item}
                                  onPromote={handlePromoteToKnowledge}
                                  onDelete={handleDeleteActivity}
                                />
                              ) : (
                                <ActivityCard 
                                  key={item.id} 
                                  activity={item}
                                  onPromote={handlePromoteToKnowledge}
                                  onDelete={handleDeleteActivity}
                                />
                              )
                            ))}
                          </div>
                        ))}

                        {hasNext && (
                          <div className="py-8 flex justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => hookData?.fetchNextPage()}
                              disabled={isFetchingNext}
                            >
                              {isFetchingNext ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Loading...
                                </>
                              ) : (
                                'Load More'
                              )}
                            </Button>
                          </div>
                        )}

                        {!hasNext && items.length > 0 && (
                          <p className="text-center text-sm text-muted-foreground py-8">
                            You've reached the beginning 📜
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
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
    </AppLayout>
  );
}

export default withScreenId(Timeline, SCREEN_IDS.MEMORY_TIMELINE);
