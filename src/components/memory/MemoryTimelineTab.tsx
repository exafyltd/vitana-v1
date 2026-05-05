import { formatDistanceToNow } from "date-fns";
import { FileText, Brain, Calendar, Tag, Maximize2, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { Skeleton } from "@/components/ui/skeleton";
import { HorizontalCardList } from "@/components/ui/horizontal-card-list";
import { StandardHorizontalCardProps } from "@/components/ui/standard-horizontal-card";
import { horizontalCardsSLO } from "@/lib/horizontal-cards-slo";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { SCREEN_IDS } from "@/lib/screen-id";
import { useEffect, useState } from "react";
import { PhotoPeekPanel } from "@/components/diary/PhotoPeekPanel";
import { PhotoLightbox } from "@/components/diary/PhotoLightbox";
import { notifyInfo, notifySuccess, t } from '@/lib/i18n-toast';

export function MemoryTimelineTab() {
  const { knowledgeItems, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useKnowledgeBase("all");
  const [photoViewState, setPhotoViewState] = useState<{
    mode: 'closed' | 'peek' | 'lightbox';
    images: string[];
    currentIndex: number;
    caption?: string;
    tags?: string[];
    createdAt?: string;
  } | null>(null);
  
  const useNewCards = isFeatureEnabled('enableHorizontalCardsTimeline');

  // SLO Tracking
  useEffect(() => {
    if (useNewCards) {
      horizontalCardsSLO.startTTI();
    }
  }, [useNewCards]);

  useEffect(() => {
    if (useNewCards && !isLoading && knowledgeItems.length > 0) {
      horizontalCardsSLO.endTTI();
    }
  }, [isLoading, useNewCards, knowledgeItems.length]);

  // Action Handlers
  const handlePromoteToKnowledge = (itemId: string) => {
    console.log('[Memory] Promoting to knowledge:', itemId);
    notifySuccess('toasts.memory.savedKnowledgeBase');
  };

  const handleDeleteActivity = (itemId: string) => {
    console.log('[Memory] Deleting activity:', itemId);
    notifySuccess('toasts.memory.activityDeleted');
  };

  const getAccentForSource = (source: string): string => {
    return source === 'ai' ? 'hsl(var(--sys-ai-accent))' : 'hsl(var(--pill-memory-accent))';
  };

  // Transform knowledge items to StandardHorizontalCardProps
  const transformedItems: StandardHorizontalCardProps[] = knowledgeItems.map(item => ({
    id: item.id,
    screenId: SCREEN_IDS.MEMORY_TIMELINE,
    icon: item.source === "ai" ? (
      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
        <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
      </div>
    ) : (
      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>
    ),
    title: item.source === "ai" ? "AI Insight" : "Diary Entry",
    description: item.content,
    badges: [
      { 
        label: item.source === "ai" ? "AI Insight" : "Diary Entry", 
        variant: item.source === "ai" ? 'default' as const : 'secondary' as const 
      },
      ...(item.memoryType ? [{ label: item.memoryType, variant: 'outline' as const }] : [])
    ],
    metadata: item.confidenceScore ? [
      {
        icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" />,
        text: `${Math.round(item.confidenceScore * 100)}% confidence`
      }
    ] : undefined,
    timestamp: new Date(item.createdAt),
    primaryAction: {
      label: 'Open',
      onClick: () => {
        console.log('Opening item:', item.id);
        // If it's a photo diary entry with attachments, open peek panel
        if (item.source === 'diary' && item.attachments && item.attachments.length > 0) {
          setPhotoViewState({
            mode: 'peek',
            images: item.attachments,
            currentIndex: 0,
            caption: item.content,
            tags: item.tags,
            createdAt: item.createdAt,
          });
        }
        // Otherwise, the expandOnPrimaryClick will handle expansion
      },
      variant: 'outline' as const,
      icon: <Maximize2 className="w-4 h-4 mr-1" />
    },
    secondaryActions: [
      ...(item.source === 'ai' ? [{
        label: 'Save as Knowledge',
        onClick: () => handlePromoteToKnowledge(item.id),
        icon: <Sparkles className="w-3 h-3 mr-1" />
      }] : []),
      { 
        label: 'Delete', 
        onClick: () => handleDeleteActivity(item.id), 
        icon: <Trash2 className="w-3 h-3 mr-1" /> 
      }
    ],
    expandedContent: item.source === 'ai' ? (
      <div className="space-y-2 transition-opacity duration-150">
        <div className="text-sm text-muted-foreground/80">
          <span className="font-medium">{t('screens.memory.type')}</span> {item.memoryType || "insight"}
        </div>
        {item.confidenceScore && (
          <div className="text-sm text-amber-600 dark:text-amber-500">
            Confidence: {Math.round(item.confidenceScore * 100)}%
          </div>
        )}
        {item.metadata && (
          <div className="text-xs text-muted-foreground/70">
            Additional metadata available
          </div>
        )}
      </div>
    ) : item.tags && item.tags.length > 0 ? (
      <div className="space-y-2 transition-opacity duration-150">
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span 
              key={tag} 
              className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10 transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    ) : undefined,
    expandOnPrimaryClick: true,
    density: 'compact' as const,
    accentColor: getAccentForSource(item.source)
  }));

  if (isLoading) {
    return (
      <div className="space-y-4 mt-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Chronological view of your knowledge base updates
      </div>

      {knowledgeItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('screens.memory.noKnowledgeBaseEntriesYet')}</p>
            <p className="text-sm mt-1">{t('screens.memory.startAddingMemoriesSeeThemHere')}</p>
          </CardContent>
        </Card>
      ) : useNewCards ? (
        <HorizontalCardList
          items={transformedItems}
          variant="standard"
          groupBy="date"
          screenId={SCREEN_IDS.MEMORY_TIMELINE}
          listId="timeline-all"
          infiniteScroll={true}
          onLoadMore={fetchNextPage}
          hasMore={hasNextPage}
          isLoading={isFetchingNextPage}
          gap="sm"
          className="pb-4"
          emptyState={
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground mb-3">
                  No activity history yet. Start using the system to see your activity!
                </p>
                <Button variant="outline" size="sm">
                  Add Memory
                </Button>
              </CardContent>
            </Card>
          }
        />
      ) : (
        <>
          {knowledgeItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {item.source === "ai" ? (
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={item.source === "ai" ? "default" : "secondary"}>
                        {item.source === "ai" ? "AI Insight" : "Diary Entry"}
                      </Badge>
                      {item.memoryType && (
                        <Badge variant="outline">{item.memoryType}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    <p className="text-sm text-foreground leading-relaxed mb-3">
                      {item.content}
                    </p>

                    {item.tags && item.tags.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        {item.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {item.confidenceScore && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Confidence: {Math.round(item.confidenceScore * 100)}%
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {hasNextPage && (
            <div className="text-center py-4">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="text-sm text-primary hover:underline"
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}

      <PhotoPeekPanel
        open={photoViewState?.mode === 'peek'}
        onOpenChange={(open) => !open && setPhotoViewState(null)}
        image={photoViewState?.images[photoViewState?.currentIndex || 0] || ''}
        images={photoViewState?.images || []}
        currentIndex={photoViewState?.currentIndex || 0}
        onIndexChange={(index) => setPhotoViewState(prev => 
          prev ? { ...prev, currentIndex: index } : null
        )}
        caption={photoViewState?.caption}
        tags={photoViewState?.tags}
        createdAt={photoViewState?.createdAt}
        onOpenFull={() => setPhotoViewState(prev => 
          prev ? { ...prev, mode: 'lightbox' } : null
        )}
        onAddToFavorites={() => {
          notifySuccess('toasts.memory.addedFavorites');
        }}
        onCopyLink={() => {
          if (photoViewState?.images[photoViewState.currentIndex]) {
            navigator.clipboard.writeText(photoViewState.images[photoViewState.currentIndex]);
            notifySuccess('toasts.memory.linkCopiedClipboard');
          }
        }}
        onEdit={() => {
          notifyInfo('toasts.memory.editFunctionalityComingSoon');
        }}
        onDelete={() => {
          notifySuccess('toasts.memory.photoDeleted');
          setPhotoViewState(null);
        }}
      />

      <PhotoLightbox
        open={photoViewState?.mode === 'lightbox'}
        onOpenChange={(open) => {
          if (!open) {
            // Return to peek mode instead of closing completely
            setPhotoViewState(prev => prev ? { ...prev, mode: 'peek' } : null);
          }
        }}
        images={photoViewState?.images || []}
        currentIndex={photoViewState?.currentIndex || 0}
        onIndexChange={(index) => setPhotoViewState(prev => 
          prev ? { ...prev, currentIndex: index } : null
        )}
        caption={photoViewState?.caption}
        tags={photoViewState?.tags}
        createdAt={photoViewState?.createdAt}
        showFilmstrip={true}
      />
    </div>
  );
}
