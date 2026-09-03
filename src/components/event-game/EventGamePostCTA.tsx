import { useState } from 'react';
import { PartyPopper, CheckCircle2 } from 'lucide-react';
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
        <div
          className="rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm text-center shadow-2xl"
          style={{ background: 'radial-gradient(ellipse 120% 60% at 50% 0%, #FFFFFF 0%, #E3F5FD 35%, #8FD5FA 100%)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white/60 backdrop-blur flex items-center justify-center ring-4 ring-white/50">
            <PartyPopper className="w-6 h-6 text-[#1B8FC7]" />
          </div>
          <p className="mb-4 text-base text-[#0B4F70]">{t('eventGame.post.mustJoinFirst')}</p>
          <Button
            size="lg"
            className="w-full rounded-full bg-gradient-to-r from-[#6CC5EC] to-[#1B8FC7] hover:from-[#8FD5FA] hover:to-[#3AA6D6] shadow-[0_10px_28px_rgba(31,143,199,0.45)] border-0"
            onClick={handleJoinAndPost}
            disabled={join.isPending}
          >
            {t('eventGame.post.joinAndPost')}
          </Button>
        </div>
      </div>
    );
  }

  if (capReached) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => onOpenChange(false)}>
        <div
          className="rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm text-center shadow-2xl"
          style={{ background: 'radial-gradient(ellipse 120% 60% at 50% 0%, #FFFFFF 0%, #E3F5FD 35%, #8FD5FA 100%)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white/60 backdrop-blur flex items-center justify-center ring-4 ring-white/50">
            <CheckCircle2 className="w-6 h-6 text-[#1B8FC7]" />
          </div>
          <p className="text-base text-[#0B4F70]">{t('eventGame.home.capReached')}</p>
          <Button
            variant="outline"
            className="w-full mt-4 rounded-full bg-white/70 backdrop-blur border-white text-[#1B8FC7] hover:bg-white hover:text-[#1B8FC7]"
            onClick={() => onOpenChange(false)}
          >
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
