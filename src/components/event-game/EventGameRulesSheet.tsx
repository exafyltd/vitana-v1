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
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-xl">{t('eventGame.rules.title')}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 py-4 text-base">
          <div>{t('eventGame.rules.join', { points: game.points_registration })}</div>
          <div>{t('eventGame.rules.event', { points: game.points_event_post })}</div>
          <div>{t('eventGame.rules.longevity', { points: game.points_longevity_post })}</div>
          <div>{t('eventGame.rules.likes', { points: game.points_like_received })}</div>
          <div className="font-semibold">{t('eventGame.rules.win')}</div>
          {game.rules_text && (
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{game.rules_text}</p>
          )}
        </div>
        <Button className="w-full" size="lg" onClick={() => onOpenChange(false)}>
          {t('eventGame.rules.close')}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
