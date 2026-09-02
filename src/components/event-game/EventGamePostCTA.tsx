import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n-toast';
import { MobileCreatePostSheet } from '@/components/profile/mobile/MobileCreatePostSheet';
import { EventGameCelebration } from '@/components/event-game/EventGameCelebration';
import { useEventGameJoin, useMyEventGameStanding } from '@/hooks/useEventGame';
import type { EventGame } from '@/hooks/useEventGame';

interface EventGamePostCTAProps {
  game: EventGame;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Owns the explicit JOIN -> POST ordering (correction #5): never silently
 * auto-enrolls via the post itself — if the user isn't already an explicit
 * participant, this shows the join action first and only opens the composer
 * once that join has actually completed. */
export function EventGamePostCTA({ game, open, onOpenChange }: EventGamePostCTAProps) {
  const { isParticipant, join } = useEventGameJoin(game.id);
  const standing = useMyEventGameStanding(game.id, { live: true });
  const [celebration, setCelebration] = useState<{ points: number } | null>(null);

  const postsUsed = standing.data?.post_count ?? 0;
  const capReached = postsUsed >= game.max_posts_per_user;

  const handleJoinAndPost = async () => {
    await join.mutateAsync();
  };

  if (!open) return null;

  if (!isParticipant) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => onOpenChange(false)}>
        <div className="bg-background rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
          <p className="mb-4 text-base">{t('eventGame.post.mustJoinFirst')}</p>
          <Button size="lg" className="w-full" onClick={handleJoinAndPost} disabled={join.isPending}>
            {t('eventGame.post.joinAndPost')}
          </Button>
        </div>
      </div>
    );
  }

  if (capReached) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => onOpenChange(false)}>
        <div className="bg-background rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
          <p className="text-base">{t('eventGame.home.capReached')}</p>
          <Button variant="outline" className="w-full mt-4" onClick={() => onOpenChange(false)}>
            {t('eventGame.rules.close')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <MobileCreatePostSheet
        open={open}
        onOpenChange={onOpenChange}
        eventGameContext={{
          eventGameId: game.id,
          eventPostPoints: game.points_event_post,
          longevityPostPoints: game.points_longevity_post,
          onPosted: ({ isLongevityBonus }) => {
            setCelebration({ points: isLongevityBonus ? game.points_longevity_post : game.points_event_post });
          },
        }}
      />
      <EventGameCelebration
        open={!!celebration}
        onOpenChange={(o) => !o && setCelebration(null)}
        title={t('eventGame.post.successTitle')}
        points={celebration ? t('eventGame.post.successPoints', { points: celebration.points }) : undefined}
      >
        <p className="text-sm text-muted-foreground">{t('eventGame.post.getLikes')}</p>
      </EventGameCelebration>
    </>
  );
}
