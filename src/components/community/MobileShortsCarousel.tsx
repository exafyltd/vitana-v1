import React, { useEffect, useRef, useState } from 'react';
import { NewsCard } from '@/components/crossover/NewsCard';
import { cn } from '@/lib/utils';
import { Play, Film } from 'lucide-react';

interface VideoShort {
  id?: string;
  title: string;
  description?: string;
  creator: string;
  creatorAvatar?: string | null;
  src_url?: string;
  thumbnail_url?: string;
  thumbnailImage?: string;
  likes: number;
  tags?: string[];
  isLive?: boolean;
  user_id?: string;
}

interface MobileShortsCarouselProps {
  shorts: VideoShort[];
  onShortClick: (index: number) => void;
  emptyState?: React.ReactNode;
}

export function MobileShortsCarousel({
  shorts,
  onShortClick,
  emptyState,
}: MobileShortsCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // IntersectionObserver to detect which card is in view
  useEffect(() => {
    const container = containerRef.current;
    if (!container || shorts.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index) && index !== currentIndex) {
              setCurrentIndex(index);
            }
          }
        }
      },
      {
        root: container,
        threshold: 0.6,
      }
    );

    const cards = container.querySelectorAll('[data-index]');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [shorts, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        containerRef.current.scrollBy({ top: -containerRef.current.clientHeight, behavior: 'smooth' });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        containerRef.current.scrollBy({ top: containerRef.current.clientHeight, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Empty state
  if (shorts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        {emptyState || (
          <div className="text-center">
            <Film className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Shorts</h3>
            <p className="text-muted-foreground">Check back soon for new shorts!</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative w-full"
      role="feed"
      aria-label="Shorts feed"
    >
      <div
        ref={containerRef}
        className="overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        style={{
          height: 'calc(100dvh - 190px)',
        } as React.CSSProperties}
      >
        {shorts.map((short, index) => {
          const imageUrl = short.thumbnail_url || short.thumbnailImage || '';

          return (
            <div
              key={short.id || index}
              data-index={index}
              className={cn(
                "snap-start transition-all duration-300 ease-out",
                index !== shorts.length - 1 && "border-b border-border/30"
              )}
              style={{
                height: 'calc(100dvh - 190px)',
                scrollSnapStop: 'normal',
                padding: '4px 0px',
                transform: currentIndex === index ? 'scale(1)' : 'scale(0.97)',
                opacity: currentIndex === index ? 1 : 0.7,
              } as React.CSSProperties}
              role="article"
              aria-label={`Short ${index + 1} of ${shorts.length}: ${short.title}`}
            >
              <NewsCard
                title={short.title}
                description={short.description || `by ${short.creator}`}
                imageUrl={imageUrl}
                category="media"
                mediaType="video"
                author={{
                  name: short.creator,
                  avatar: short.creatorAvatar || undefined,
                }}
                onClick={() => onShortClick(index)}
                utilityTopRight={
                  <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play className="h-4 w-4 text-white ml-0.5" />
                  </div>
                }
                className="h-full rounded-[26px] ring-1 ring-black/5 shadow-[0_18px_45px_rgba(0,0,0,0.18)]"
              />
            </div>
          );
        })}
      </div>

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
