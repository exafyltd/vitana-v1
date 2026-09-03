import { useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { confettiManager } from '@/lib/confetti';

/** Faint decorative wave along the card's foot — purely cosmetic, mirrors
 * the same accent used on EventGameHomeView. */
function DecorativeWave({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 30 Q 50 10 100 25 T 200 20 V40 H0 Z" fill="currentColor" />
    </svg>
  );
}

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
  /** Auto-close after this many ms so the celebration never blocks the next
   * action (e.g. tapping Post) indefinitely. Set to 0 to disable. */
  autoDismissMs?: number;
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
  autoDismissMs = 3000,
  children,
}: EventGameCelebrationProps) {
  useEffect(() => {
    if (open && confetti) {
      confettiManager.fire({ particleCount: 120, spread: 75, scalar: 1.1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !autoDismissMs) return;
    const timer = setTimeout(() => onOpenChange(false), autoDismissMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoDismissMs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm w-[calc(100%-2rem)] border-0 p-0 overflow-hidden rounded-3xl bg-transparent shadow-2xl">
        <div
          className="relative flex flex-col items-center text-center px-6 pt-10 pb-8 gap-4 overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse 120% 60% at 50% 0%, #FFFFFF 0%, #E3F5FD 35%, #8FD5FA 100%)',
          }}
        >
          {/* Decorative glow + footer wave — purely cosmetic */}
          <div className="pointer-events-none absolute -top-8 -left-8 w-40 h-40 rounded-full bg-white/30 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          <DecorativeWave className="pointer-events-none absolute bottom-0 left-0 w-full h-16 text-white/50" />

          <div className="relative w-20 h-20 rounded-full bg-white/60 backdrop-blur flex items-center justify-center ring-4 ring-white/50 shadow-[0_0_30px_rgba(31,143,199,0.5)]">
            <Trophy className="w-10 h-10 text-[#1B8FC7]" />
          </div>

          <DialogTitle className="relative text-2xl font-extrabold text-[#0B4F70]">{title}</DialogTitle>
          {points && (
            <div className="relative text-5xl font-extrabold bg-gradient-to-r from-[#6CC5EC] to-[#1B8FC7] bg-clip-text text-transparent">
              {points}
            </div>
          )}
          {subtitle && <div className="relative text-sm text-[#0B4F70]/70">{subtitle}</div>}
          {children && (
            <div className="relative w-full rounded-2xl bg-white/70 backdrop-blur px-4 py-4 shadow-[0_4px_16px_rgba(31,143,199,0.15)]">
              {children}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
