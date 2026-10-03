/**
 * VTID-04859 · Founding 1000 celebration.
 *
 * The first 1,000 members get a full year of Premium (worth 12 × €9.99).
 * The gateway seats them automatically at signup; this modal tells them, once:
 * their Founding Member number, the value of the gift and how long Premium
 * runs. It opens on the first screen after onboarding (and, for members who
 * joined before this shipped, the next time they open the app).
 *
 * Reading is the only thing it does on its own (GET /billing/founding/me).
 * The one write — marking the celebration as seen — happens only when the
 * member closes it.
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Crown, Gift, CalendarCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n-toast';
import { fmtDate, fmtNumber } from '@/lib/locale-format';
import { fetchFoundingMe, markFoundingCelebrated } from '@/lib/billingApi';
import { foundingQueryKey, isFoundingCelebrationSuppressed, shouldCelebrate } from './founding-celebration-logic';
import { useAuth } from '@/context/AuthProvider';

function fireConfetti() {
  const colors = ['#F59E0B', '#FBBF24', '#8B5CF6', '#10B981'];
  confetti({ particleCount: 120, spread: 80, startVelocity: 45, origin: { y: 0.35 }, colors });
  window.setTimeout(() => {
    confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors });
    confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors });
  }, 350);
}

export default function FoundingCelebration() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = foundingQueryKey(user?.id);
  const reduceMotion = useReducedMotion();
  const [dismissed, setDismissed] = useState(false);
  const celebratedOnce = useRef(false);

  const { data } = useQuery({
    queryKey,
    queryFn: fetchFoundingMe,
    enabled: !!user?.id,
    staleTime: Infinity,
    retry: false,
  });

  const open = !dismissed && shouldCelebrate(data) && !isFoundingCelebrationSuppressed(location.pathname);

  useEffect(() => {
    if (open && !celebratedOnce.current) {
      celebratedOnce.current = true;
      if (!reduceMotion) fireConfetti();
    }
  }, [open, reduceMotion]);

  const close = (next?: string) => {
    setDismissed(true);
    markFoundingCelebrated()
      .then(() => queryClient.setQueryData(queryKey, { ...data, celebrated: true }))
      .catch((err) => console.error('[founding] could not record the celebration', err));
    if (next) navigate(next);
  };

  if (!data || !shouldCelebrate(data)) return null;

  const max = fmtNumber(data.max_seats);
  const paid = data.grant_source === 'stripe_active';
  const value = fmtNumber((data.value_cents ?? 11988) / 100, { style: 'currency', currency: 'EUR' });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="sm:max-w-md text-center overflow-hidden" data-testid="founding-celebration">
        <motion.div
          initial={reduceMotion ? false : { scale: 0.6, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          className="mx-auto mt-2 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg"
          aria-hidden="true"
        >
          <Crown className="h-10 w-10 text-white" />
        </motion.div>

        <DialogHeader className="items-center text-center sm:text-center">
          <motion.span
            initial={reduceMotion ? false : { y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
            data-testid="founding-badge"
          >
            {t('billing.founding.celebration.badge', { seat: fmtNumber(data.seat_number!), max })}
          </motion.span>
          <DialogTitle className="mt-3 text-2xl">{t('billing.founding.celebration.title')}</DialogTitle>
          <DialogDescription className="mt-2 text-base">
            {paid
              ? t('billing.founding.celebration.bodyPaid', { max })
              : t('billing.founding.celebration.bodyFree', { max })}
          </DialogDescription>
        </DialogHeader>

        {!paid && (
          <motion.div
            initial={reduceMotion ? false : { y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-2 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-start dark:border-amber-800 dark:bg-amber-950/30"
          >
            <div className="flex items-center gap-3">
              <Gift className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('billing.founding.celebration.valueLabel')}
                </div>
                <div className="font-semibold" data-testid="founding-value">
                  {t('billing.founding.celebration.value', { value })}
                </div>
              </div>
            </div>
            {data.granted_until && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <CalendarCheck className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                <span>{t('billing.founding.celebration.until', { date: fmtDate(new Date(data.granted_until)) })}</span>
              </div>
            )}
          </motion.div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => close()} className="min-h-11">
            {t('billing.founding.celebration.ctaContinue')}
          </Button>
          <Button variant="outline" onClick={() => close('/wallet/subscriptions')} className="min-h-11">
            {t('billing.founding.celebration.ctaPremium')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
