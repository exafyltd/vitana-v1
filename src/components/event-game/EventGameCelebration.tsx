import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { confettiManager } from '@/lib/confetti';

interface EventGameCelebrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  points?: string;
  /** Whether to fire the confetti burst — used for genuine wins/milestones,
   * skipped for lighter moments (e.g. "moved up one rank") per the plan's
   * "use celebratory popups selectively" instruction. */
  confetti?: boolean;
  children?: React.ReactNode;
}

/** Small, self-contained celebration dialog reusing the same Dialog
 * primitives and the underlying confettiManager.fire() burst that
 * MilestoneCelebration.tsx/confetti.ts already use in production, without
 * routing through celebrateSuccess()'s wallet-currency-shaped SuccessEvent
 * (amount/currency/type) — this feature has no wallet reward, so
 * confettiManager.fire() (the primitive celebrateSuccess itself calls) is
 * the correct, more direct reuse point. */
export function EventGameCelebration({
  open,
  onOpenChange,
  title,
  subtitle,
  points,
  confetti = true,
  children,
}: EventGameCelebrationProps) {
  useEffect(() => {
    if (open && confetti) {
      confettiManager.fire({ particleCount: 120, spread: 75, scalar: 1.1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-center sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          {points && <div className="text-3xl font-bold text-primary my-2">{points}</div>}
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
