import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n-toast';
import type { EventGame } from '@/hooks/useEventGame';

interface EventGameRulesSheetProps {
  game: EventGame;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** "How to Play" — a lightweight sheet, not a new route. Content is driven
 * by the event's own configured point values so it never drifts from the
 * real scoring an admin configured. */
export function EventGameRulesSheet({ game, open, onOpenChange }: EventGameRulesSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl"
        style={{ background: 'linear-gradient(to bottom, hsl(var(--card)) 0%, hsl(var(--category-7) / 0.15) 40%, hsl(var(--card)) 100%)' }}
      >
        <SheetHeader>
          <SheetTitle className="text-xl text-category-7">{t('eventGame.rules.title')}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 py-4 text-base text-foreground">
          <div>{t('eventGame.rules.join', { points: game.points_registration })}</div>
          <div>{t('eventGame.rules.event', { points: game.points_event_post })}</div>
          <div>{t('eventGame.rules.longevity', { points: game.points_longevity_post })}</div>
          <div>{t('eventGame.rules.likes', { points: game.points_like_received })}</div>
          <div className="font-bold text-category-7">{t('eventGame.rules.win')}</div>
          {game.rules_text && (
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{game.rules_text}</p>
          )}
        </div>
        <Button
          className="w-full rounded-full bg-gradient-to-r from-category-7/70 to-category-7 hover:from-category-7/45 hover:to-category-7/85 shadow-[0_10px_28px_rgba(31,143,199,0.45)] hover:shadow-[0_12px_32px_rgba(31,143,199,0.55)] transition-all duration-300 border-0"
          size="lg"
          onClick={() => onOpenChange(false)}
        >
          {t('eventGame.rules.close')}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
