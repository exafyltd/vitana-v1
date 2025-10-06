import { useState, useRef, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { TimelineMasterActionPopup } from "@/components/memory/TimelineMasterActionPopup";
import { MemoryCard } from "@/components/memory/MemoryCard";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { useMemoryTimeline } from "@/hooks/useMemoryTimeline";
import { Card, CardContent } from "@/components/ui/card";

function Timeline() {
  const [actionPopupOpen, setActionPopupOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "insights" | "conversations">("all");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    memories,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    deleteMemory
  } = useMemoryTimeline(filter);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleEdit = (id: string) => {
    setEditingId(id);
    // TODO: Open edit dialog
    console.log("Edit memory:", id);
  };

  const handleDelete = (id: string, source: "ai" | "diary" | "conversation") => {
    if (confirm("Are you sure you want to delete this memory? This action cannot be undone.")) {
      deleteMemory({ id, source });
    }
  };

  return (
    <AppLayout>
      <SEO 
        title="Memory Timeline | VITANA" 
        description="View your complete memory timeline with AI insights and diary entries in chronological order." 
      />
      <SubNavigation items={memoryNavigation} />
      
      <div className="p-6">
        <StandardHeader 
          title="Memory Timeline"
          description="Your complete wellness journey in chronological order"
          emoji="📅"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder="Search timeline..." />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setActionPopupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Record Moment
          </Button>
        </UtilityActionButton>

        {/* Filter Buttons */}
        <div className="flex gap-2 mt-4">
          <Button 
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button 
            variant={filter === "insights" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("insights")}
          >
            Insights Only
          </Button>
          <Button 
            variant={filter === "conversations" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("conversations")}
          >
            Conversations Only
          </Button>
        </div>

        {/* Timeline Content */}
        <div className="mt-6 max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : memories.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No memories yet. Start recording your wellness journey!
                </p>
                <Button onClick={() => setActionPopupOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Memory
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {memories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  id={memory.id}
                  content={memory.content}
                  source={memory.source}
                  memoryType={memory.memoryType}
                  sourceType={memory.sourceType}
                  tags={memory.tags}
                  confidenceScore={memory.confidenceScore}
                  duration={memory.duration}
                  createdAt={memory.createdAt}
                  metadata={memory.metadata}
                  onEdit={handleEdit}
                  onDelete={(id) => handleDelete(id, memory.source)}
                />
              ))}

              {/* Load More Trigger */}
              {hasNextPage && (
                <div ref={loadMoreRef} className="py-8 flex justify-center">
                  {isFetchingNextPage && (
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  )}
                </div>
              )}

              {!hasNextPage && memories.length > 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  You've reached the beginning of your memory timeline 🎉
                </p>
              )}
            </div>
          )}
        </div>

        <TimelineMasterActionPopup 
          open={actionPopupOpen}
          onOpenChange={setActionPopupOpen}
        />
      </div>
    </AppLayout>
  );
}

export default withScreenId(Timeline, SCREEN_IDS.MEMORY_TIMELINE);
