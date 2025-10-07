import { formatDistanceToNow } from "date-fns";
import { FileText, Brain, Calendar, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { Skeleton } from "@/components/ui/skeleton";

export function MemoryTimelineTab() {
  const { knowledgeItems, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useKnowledgeBase("all");

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
            <p>No knowledge base entries yet</p>
            <p className="text-sm mt-1">Start adding memories to see them here</p>
          </CardContent>
        </Card>
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
    </div>
  );
}
