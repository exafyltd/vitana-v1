import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";
import { t } from '@/lib/i18n-toast';

import { formatDistanceToNow } from '@/lib/locale-format';
interface PhotoEntryCardProps {
  id: string;
  text: string;
  attachments: string[];
  tags: string[];
  createdAt: string;
  onThumbnailClick: () => void;
  onDelete?: (id: string) => void;
}

export function PhotoEntryCard({
  id,
  text,
  attachments,
  tags,
  createdAt,
  onThumbnailClick,
  onDelete,
}: PhotoEntryCardProps) {
  const photoCount = attachments.length;
  const hasMultiplePhotos = photoCount > 1;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          {text && (
            <p className="text-sm font-medium line-clamp-2 mb-2">{text}</p>
          )}
          
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground flex-1">
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={t('screens.diary.deleteEntry')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div
          className="relative flex-shrink-0 cursor-pointer group"
          onClick={onThumbnailClick}
        >
          <ImageWithFallback
            src={attachments[0]}
            alt={t('screens.diary.photoEntry')}
            className="w-20 h-20 md:w-24 md:h-24 rounded-lg aspect-square group-hover:opacity-90 transition-opacity"
          />
          {hasMultiplePhotos && (
            <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full">
              +{photoCount - 1}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
