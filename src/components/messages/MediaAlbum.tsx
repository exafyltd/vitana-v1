/**
 * VTID-05316 (messenger-ux-v2/ui-media-album, R10) — the pictures and videos
 * of one message as a grid instead of a vertical stack.
 *
 *   2 items  → two side by side (1×2)
 *   3 items  → one wide on top, two below (1 + 2)
 *   4 items  → a 2×2 grid
 *   5+ items → a 2×2 grid; the fourth tile is covered by "+N", N = the items
 *              not fully visible (the covered one and the rest)
 *
 * Every item stays reachable: a tap opens the full-screen viewer at that item,
 * where the arrows / swipe go through all of them (the "+N" tile opens the 4th).
 * The tile is a button (keyboard reachable, labelled). Videos show their first
 * frame with a play mark and play in the viewer with native controls.
 */
import React from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';

export interface AlbumItem {
  key: string;
  kind: 'image' | 'video';
  /** undefined = still signing → skeleton tile. */
  url: string | undefined;
  alt: string;
}

interface MediaAlbumProps {
  items: AlbumItem[];
  onOpen: (index: number) => void;
  onImageError?: (index: number) => void;
  className?: string;
}

export const ALBUM_VISIBLE = 4;

const VIDEO_NAME_RX = /\.(mp4|webm|mov|m4v)$/i;

/** A video attachment: type 'video', a video mime, or a video file name. */
export function isVideoAttachment(att: { type?: string; mime?: string; filename?: string; name?: string } | null | undefined): boolean {
  if (!att) return false;
  return att.type === 'video' || (att.mime || '').toLowerCase().startsWith('video/') || VIDEO_NAME_RX.test(att.filename || att.name || '');
}

/** Layout of `count` items: how many tiles, and the "+N" on the last tile (0 = none). */
export function albumLayout(count: number): { shown: number; more: number; variant: 'two' | 'three' | 'grid' | 'none' } {
  if (count < 2) return { shown: count, more: 0, variant: 'none' };
  if (count === 2) return { shown: 2, more: 0, variant: 'two' };
  if (count === 3) return { shown: 3, more: 0, variant: 'three' };
  return { shown: ALBUM_VISIBLE, more: count > ALBUM_VISIBLE ? count - (ALBUM_VISIBLE - 1) : 0, variant: 'grid' };
}

const MediaAlbum: React.FC<MediaAlbumProps> = ({ items, onOpen, onImageError, className }) => {
  const { shown, more, variant } = albumLayout(items.length);
  if (variant === 'none') return null;
  return (
    <div
      className={cn('grid w-72 max-w-full grid-cols-2 gap-0.5 overflow-hidden rounded-lg', className)}
      data-testid="media-album"
      data-variant={variant}
    >
      {items.slice(0, shown).map((item, index) => {
        const isMoreTile = more > 0 && index === shown - 1;
        const label = isMoreTile
          ? t('inbox.media.moreItems', { count: more })
          : item.kind === 'video'
            ? t('inbox.media.openVideo', { name: item.alt })
            : t('inbox.media.openImage', { name: item.alt });
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onOpen(index)}
            aria-label={label}
            data-testid="media-album-tile"
            data-kind={item.kind}
            className={cn(
              'relative block aspect-square overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              variant === 'three' && index === 0 && 'col-span-2 aspect-video',
            )}
          >
            {item.url === undefined ? (
              <span className="block h-full w-full animate-pulse bg-muted" role="status" aria-label={t('screens.messages.imageLoading')} data-testid="media-album-skeleton" />
            ) : item.kind === 'video' ? (
              <>
                <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-cover" aria-hidden tabIndex={-1} />
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/60 text-background">
                    <Play className="h-5 w-5 ms-0.5" />
                  </span>
                </span>
              </>
            ) : (
              <img
                src={item.url}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
                onError={() => onImageError?.(index)}
              />
            )}
            {isMoreTile && (
              <span
                className="absolute inset-0 flex items-center justify-center bg-foreground/60 text-xl font-semibold text-background"
                aria-hidden
                data-testid="media-album-more"
              >
                +{more}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default MediaAlbum;
