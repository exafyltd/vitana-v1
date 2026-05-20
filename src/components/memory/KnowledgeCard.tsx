import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Edit2, Trash2, Clock, Star } from "lucide-react";
import type { KnowledgeItem } from "@/hooks/useKnowledgeBase";
import { t } from '@/lib/i18n-toast';

import { formatDistanceToNow } from '@/lib/locale-format';
interface KnowledgeCardProps {
  item: KnowledgeItem;
  onEdit: (id: string) => void;
  onDelete: (id: string, source: "ai" | "diary") => void;
}

export function KnowledgeCard({ item, onEdit, onDelete }: KnowledgeCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getSourceIcon = () => {
    return <Brain className="w-4 h-4" />;
  };

  const getSourceLabel = () => {
    return item.source === "ai" ? "AI Insight" : "Diary Entry";
  };

  const renderConfidence = () => {
    if (!item.confidenceScore || item.source !== "ai") return null;
    
    const stars = Math.round(item.confidenceScore * 5);
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${
              i < stars
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Card
      className="border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-950/20 transition-all duration-200 hover:shadow-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            {getSourceIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700"
              >
                {getSourceLabel()}
              </Badge>
              
              {item.memoryType && (
                <Badge variant="secondary" className="text-xs">
                  {item.memoryType}
                </Badge>
              )}

              {renderConfidence()}

              <Badge className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                {t('screens.memory.aiUsesThis')}
              </Badge>
            </div>

            <p className="text-sm text-foreground/90 mb-3 line-clamp-3">
              {item.content}
            </p>

            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {item.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </span>
              </div>

              {isHovered && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(item.id)}
                    className="h-7 px-2"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    {t('screens.memory.edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(item.id, item.source)}
                    className="h-7 px-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    {t('screens.memory.delete')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
