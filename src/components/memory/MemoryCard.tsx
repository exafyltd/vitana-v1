import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Brain, Mic, Image as ImageIcon, FileText, Clock, Star, MessageCircle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemoryReinforce } from "@/hooks/useMemoryReinforce";
import { t } from '@/lib/i18n-toast';

import { formatDistanceToNow } from '@/lib/locale-format';
interface MemoryCardProps {
  id: string;
  content: string;
  source: "ai" | "diary" | "conversation";
  memoryType?: string; // For AI: insight, pattern, preference, goal, fact
  sourceType?: string; // For diary: voice, text, image
  tags?: string[];
  confidenceScore?: number;
  duration?: number;
  createdAt: string;
  metadata?: any;
  conversationId?: string;
  role?: "user" | "assistant";
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export function MemoryCard({
  id,
  content,
  source,
  memoryType,
  sourceType,
  tags = [],
  confidenceScore,
  duration,
  createdAt,
  metadata,
  conversationId,
  role,
  onEdit,
  onDelete,
  className
}: MemoryCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { reinforceMemory } = useMemoryReinforce();

  const handleConfirm = () => {
    reinforceMemory({ memoryIds: [id], action: 'confirm' });
  };

  const handleContradict = () => {
    reinforceMemory({ memoryIds: [id], action: 'contradict' });
  };

  const getSourceIcon = () => {
    if (source === "conversation") {
      return role === "user" ? <MessageCircle className="w-4 h-4" /> : <Brain className="w-4 h-4" />;
    }
    if (source === "ai") return <Brain className="w-4 h-4" />;
    if (sourceType === "voice") return <Mic className="w-4 h-4" />;
    if (sourceType === "image") return <ImageIcon className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getSourceColor = () => {
    if (source === "conversation") {
      return role === "user" 
        ? "bg-blue-500/10 text-blue-600 border-blue-200" 
        : "bg-purple-500/10 text-purple-600 border-purple-200";
    }
    if (source === "ai") return "bg-purple-500/10 text-purple-600 border-purple-200";
    if (sourceType === "voice") return "bg-blue-500/10 text-blue-600 border-blue-200";
    if (sourceType === "image") return "bg-pink-500/10 text-pink-600 border-pink-200";
    return "bg-gray-500/10 text-gray-600 border-gray-200";
  };

  const getSourceLabel = () => {
    if (source === "conversation") return role === "user" ? "You" : "AI Response";
    if (source === "ai") return memoryType || "AI Insight";
    return sourceType || "Diary Entry";
  };

  const renderConfidence = () => {
    if (!confidenceScore) return null;
    const stars = Math.round(confidenceScore * 5);
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={cn("w-3 h-3", i < stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300")} 
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">
          {Math.round(confidenceScore * 100)}%
        </span>
      </div>
    );
  };

  return (
    <Card
      className={cn(
        "relative transition-all duration-200 hover:shadow-lg border-2",
        isHovered && "border-primary/20",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Badge variant="outline" className={cn("gap-1.5", getSourceColor())}>
              {getSourceIcon()}
              <span className="text-xs font-medium">
                {getSourceLabel()}
              </span>
            </Badge>

            {tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {tags.slice(0, 3).map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {conversationId && (
              <span className="text-xs text-muted-foreground">{t('screens.memory.conversation')}</span>
            )}
          </div>

          {/* Action Buttons - Visible on hover */}
          <div className={cn(
            "flex gap-1 transition-opacity duration-200",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            {onEdit && source !== "conversation" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(id)}
                className="h-7 w-7 p-0"
                title={t('screens.memory.editMemory')}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            )}
            {source !== "conversation" && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleConfirm}
                  className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                  title={t('screens.memory.confirmIncreasesConfidence')}
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleContradict}
                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                  title={t('screens.memory.markAsIncorrectDecreasesConfidence')}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(id)}
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {source === "conversation" ? (
          <div className={cn(
            "pl-3 border-l-2",
            role === "user" ? "border-blue-400" : "border-purple-400"
          )}>
            <p className="text-sm text-foreground line-clamp-3 leading-relaxed">
              {content}
            </p>
          </div>
        ) : (
          <p className="text-sm text-foreground line-clamp-3 leading-relaxed">
            {content}
          </p>
        )}

        {/* Footer Row */}
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
            {duration && (
              <span>
                {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
              </span>
            )}
          </div>

          {renderConfidence()}
        </div>
      </CardContent>
    </Card>
  );
}
