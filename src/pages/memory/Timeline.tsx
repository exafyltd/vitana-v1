import { useState, useRef, useEffect } from "react";
import { Plus, Loader2, History, Brain } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { TimelineMasterActionPopup } from "@/components/memory/TimelineMasterActionPopup";
import { ActivityCard } from "@/components/memory/ActivityCard";
import { ConversationCard } from "@/components/memory/ConversationCard";
import { KnowledgeCard } from "@/components/memory/KnowledgeCard";
import { PromoteToKnowledgeDialog } from "@/components/memory/PromoteToKnowledgeDialog";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { useActivityHistory } from "@/hooks/useActivityHistory";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemoryEditDialog } from "@/components/memory/MemoryEditDialog";

function Timeline() {
  const [actionPopupOpen, setActionPopupOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<any>(null);
  const [promotingActivity, setPromotingActivity] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"activity" | "knowledge">("activity");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [knowledgeFilter, setKnowledgeFilter] = useState<"all" | "insights" | "diary">("all");
  
  const activityLoadMoreRef = useRef<HTMLDivElement>(null);
  const knowledgeLoadMoreRef = useRef<HTMLDivElement>(null);

  // Activity History hook
  const {
    allItems,
    conversationExchanges,
    logActivities,
    fetchNextPage: fetchNextActivity,
    hasNextPage: hasNextActivity,
    isFetchingNextPage: isFetchingNextActivity,
    isLoading: isLoadingActivity,
  } = useActivityHistory(activityFilter);

  // Knowledge Base hook
  const {
    knowledgeItems,
    fetchNextPage: fetchNextKnowledge,
    hasNextPage: hasNextKnowledge,
    isFetchingNextPage: isFetchingNextKnowledge,
    isLoading: isLoadingKnowledge,
    deleteKnowledge,
    updateKnowledge,
    createKnowledge,
    isUpdating,
    isCreating,
  } = useKnowledgeBase(knowledgeFilter);

  // Infinite scroll for Activity History
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextActivity && !isFetchingNextActivity) {
          fetchNextActivity();
        }
      },
      { threshold: 0.5 }
    );

    if (activityLoadMoreRef.current) {
      observer.observe(activityLoadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextActivity, isFetchingNextActivity, fetchNextActivity]);

  // Infinite scroll for Knowledge Base
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextKnowledge && !isFetchingNextKnowledge) {
          fetchNextKnowledge();
        }
      },
      { threshold: 0.5 }
    );

    if (knowledgeLoadMoreRef.current) {
      observer.observe(knowledgeLoadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextKnowledge, isFetchingNextKnowledge, fetchNextKnowledge]);

  const handleEditKnowledge = (id: string) => {
    const knowledge = knowledgeItems.find((k) => k.id === id);
    if (knowledge) {
      setEditingKnowledge(knowledge);
      setEditDialogOpen(true);
    }
  };

  const handleDeleteKnowledge = (id: string, source: "ai" | "diary") => {
    if (confirm("Are you sure you want to delete this knowledge? This action cannot be undone.")) {
      deleteKnowledge({ id, source });
    }
  };

  const handleSaveKnowledge = (data: any) => {
    if (data.isNew) {
      createKnowledge(data);
    } else {
      updateKnowledge(data);
    }
    setEditDialogOpen(false);
    setEditingKnowledge(null);
  };

  const handleCreateNew = () => {
    setEditingKnowledge(null);
    setEditDialogOpen(true);
  };

  const handlePromoteToKnowledge = (itemId: string) => {
    // Check if it's an exchange or activity
    const exchange = conversationExchanges.find((ex) => ex.id === itemId);
    const activity = logActivities.find((a) => a.id === itemId);
    
    if (exchange) {
      setPromotingActivity(exchange.userMessage);
      setPromoteDialogOpen(true);
    } else if (activity) {
      setPromotingActivity(activity);
      setPromoteDialogOpen(true);
    }
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
  const activityItems = allItems.filter((i: any) => {
    if (i.itemType === 'activity') {
      return i.activityType !== 'memory.delete';
    }
    return true;
  });
  return (
    <AppLayout>
      <SEO 
        title="Memory Timeline | VITANA" 
        description="View your complete memory timeline with AI insights and diary entries in chronological order." 
      />
      <SubNavigation items={memoryNavigation} />
      
      <div className="p-6">
        <StandardHeader 
          title="Memory Systems"
          description="Track your activity and manage your AI knowledge base"
          emoji="🧠"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder="Search memories..." />
          <UniversalCalendarButton />
          {activeTab === "knowledge" && (
            <Button size="sm" onClick={handleCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              New Knowledge
            </Button>
          )}
        </UtilityActionButton>

        {/* Tabs for Activity History and Knowledge Base */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "activity" | "knowledge")} className="mt-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Activity History
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Knowledge Base
            </TabsTrigger>
          </TabsList>

          {/* Activity History Tab */}
          <TabsContent value="activity" className="mt-6">
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                📜 <strong>Activity History:</strong> A read-only chronological record of your system usage. This data is NOT used by AI for context.
              </p>
            </div>

            {/* Activity Filter Buttons */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button 
                variant={activityFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setActivityFilter("all")}
              >
                All
              </Button>
              <Button 
                variant={activityFilter === "chat" ? "default" : "outline"}
                size="sm"
                onClick={() => setActivityFilter("chat")}
              >
                💬 Chat
              </Button>
              <Button 
                variant={activityFilter === "memory" ? "default" : "outline"}
                size="sm"
                onClick={() => setActivityFilter("memory")}
              >
                🧠 Memory
              </Button>
              <Button 
                variant={activityFilter === "wallet" ? "default" : "outline"}
                size="sm"
                onClick={() => setActivityFilter("wallet")}
              >
                💰 Wallet
              </Button>
              <Button 
                variant={activityFilter === "discover" ? "default" : "outline"}
                size="sm"
                onClick={() => setActivityFilter("discover")}
              >
                ❤️ Discover
              </Button>
              <Button 
                variant={activityFilter === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setActivityFilter("calendar")}
              >
                📅 Calendar
              </Button>
              <Button 
                variant={activityFilter === "autopilot" ? "default" : "outline"}
                size="sm"
                onClick={() => setActivityFilter("autopilot")}
              >
                🤖 Autopilot
              </Button>
              <Button 
                variant={activityFilter === "health" ? "default" : "outline"}
                size="sm"
                onClick={() => setActivityFilter("health")}
              >
                🩺 Health
              </Button>
              <Button 
                variant={activityFilter === "community" ? "default" : "outline"}
                size="sm"
                onClick={() => setActivityFilter("community")}
              >
                👥 Community
              </Button>
            </div>

            <div className="max-w-7xl mx-auto">
              {isLoadingActivity ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : activityItems.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">
                      No activity history yet. Start using the system to see your activity!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupItemsByDate(activityItems)).map(([dateGroup, items]) => (
                    <div key={dateGroup} className="space-y-3">
                      <h3 className="sticky top-0 bg-background z-10 py-2 font-semibold text-sm text-muted-foreground border-b">
                        {dateGroup}
                      </h3>
                      {items.map((item) => (
                        item.itemType === 'exchange' ? (
                          <ConversationCard
                            key={item.id}
                            exchange={item}
                            onPromote={handlePromoteToKnowledge}
                          />
                        ) : (
                          <ActivityCard 
                            key={item.id} 
                            activity={item}
                            onPromote={handlePromoteToKnowledge}
                          />
                        )
                      ))}
                    </div>
                  ))}

                  {hasNextActivity && (
                    <div ref={activityLoadMoreRef} className="py-8 flex justify-center">
                      {isFetchingNextActivity && (
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      )}
                    </div>
                  )}

                  {!hasNextActivity && activityItems.length > 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      You've reached the beginning of your activity history 📜
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Knowledge Base Tab */}
          <TabsContent value="knowledge" className="mt-6">
            <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                🧠 <strong>Knowledge Base:</strong> Curated facts and insights that AI uses to provide personalized answers. You can edit, delete, and manage these items.
              </p>
            </div>

            {/* Knowledge Filter Buttons */}
            <div className="flex gap-2 mb-4">
              <Button 
                variant={knowledgeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setKnowledgeFilter("all")}
              >
                All
              </Button>
              <Button 
                variant={knowledgeFilter === "insights" ? "default" : "outline"}
                size="sm"
                onClick={() => setKnowledgeFilter("insights")}
              >
                AI Insights
              </Button>
              <Button 
                variant={knowledgeFilter === "diary" ? "default" : "outline"}
                size="sm"
                onClick={() => setKnowledgeFilter("diary")}
              >
                Diary Entries
              </Button>
            </div>

            <div className="max-w-7xl mx-auto">
              {isLoadingKnowledge ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : knowledgeItems.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground mb-4">
                      No knowledge items yet. Create your first knowledge entry!
                    </p>
                    <Button onClick={handleCreateNew}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Knowledge
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {knowledgeItems.map((item) => (
                    <KnowledgeCard
                      key={item.id}
                      item={item}
                      onEdit={handleEditKnowledge}
                      onDelete={handleDeleteKnowledge}
                    />
                  ))}

                  {hasNextKnowledge && (
                    <div ref={knowledgeLoadMoreRef} className="py-8 flex justify-center">
                      {isFetchingNextKnowledge && (
                        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                      )}
                    </div>
                  )}

                  {!hasNextKnowledge && knowledgeItems.length > 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      You've reached the end of your knowledge base 🎉
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <TimelineMasterActionPopup 
          open={actionPopupOpen}
          onOpenChange={setActionPopupOpen}
        />

        <MemoryEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          memory={editingKnowledge}
          onSave={handleSaveKnowledge}
          isSaving={isUpdating || isCreating}
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
