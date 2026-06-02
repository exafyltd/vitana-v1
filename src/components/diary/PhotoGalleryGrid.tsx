import { ImageWithFallback } from "./ImageWithFallback";
import { formatDate } from '@/lib/locale-format';
import { t } from '@/lib/i18n-toast';
interface DiaryEntry {
  id: string;
  text: string;
  attachments: string[];
  tags: string[];
  created_at: string;
}

interface PhotoGalleryGridProps {
  entries: DiaryEntry[];
  onEntryClick: (entry: DiaryEntry) => void;
}

export function PhotoGalleryGrid({ entries, onEntryClick }: PhotoGalleryGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
      {entries.map((entry) => {
        const photoCount = entry.attachments.length;
        const hasMultiplePhotos = photoCount > 1;

        return (
          <div
            key={entry.id}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => onEntryClick(entry)}
          >
            <ImageWithFallback
              src={entry.attachments[0]}
              alt={entry.text || t('screens.diary.photoEntry')}
              className="w-full h-full"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
              {formatDate(new Date(entry.created_at), "MMM d")}
            </div>
            
            {hasMultiplePhotos && (
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
                {photoCount}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
