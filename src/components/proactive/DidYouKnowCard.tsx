/**
 * Did-You-Know Tour — silent-fallback Card (BOOTSTRAP-DYK-TOUR)
 *
 * Shows the next eligible Index-centric tip when ORB isn't actively speaking.
 * Voice-first delivery via ORB is wired separately in Phase 1b on the gateway;
 * this card is the fallback for muted / mobile-WebView / pre-ORB sessions.
 *
 * Plan: .claude/plans/proactive-did-you-generic-sifakis.md (vitana-platform)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, X, MoreVertical } from 'lucide-react';
import { useDidYouKnowTip } from '@/hooks/useDidYouKnowTip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { t } from '@/lib/i18n-toast';

export function DidYouKnowCard() {
  const navigate = useNavigate();
  const { tip, accept, decline } = useDidYouKnowTip();
  const [busy, setBusy] = useState(false);

  if (!tip) return null;

  const handleShowMe = () => {
    if (busy) return;
    setBusy(true);
    const url = accept();
    if (url) {
      // Allow the mutation to fire before nav so the backend records the
      // touch + introduction even if React-Router unmounts the card.
      try {
        sessionStorage.setItem(
          'vitana.last_tour_tip',
          JSON.stringify({
            tip_key: tip.tip_key,
            feature_key: tip.feature_key,
            voice_on_nav: tip.voice_on_nav,
            landed_at: Date.now(),
          }),
        );
      } catch {}
      navigate(url);
    }
  };

  return (
    <div
      className="relative w-full rounded-xl border border-violet-300/30 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-violet-500/10 p-4 animate-fade-in"
      role="status"
      aria-live="polite"
      data-testid="dyk-card"
    >
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/40 transition-colors"
            aria-label={t('screens.proactive.moreOptions')}
          >
            <MoreVertical className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => decline('today')}>{t('screens.proactive.notToday')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => decline('stop')}>{t('screens.proactive.stopTour')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={() => decline('tip')}
          className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/40 transition-colors"
          aria-label="Dismiss tip"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-start gap-3 pr-14">
        <div className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-300" />
          </div>
        </div>
        <div className="flex-1">
          <div className="inline-flex items-center gap-1.5 mb-1.5 rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            {t('screens.proactive.didYouKnow')}
          </div>
          <p className="text-sm text-foreground leading-relaxed">{tip.card_copy}</p>
          <button
            onClick={handleShowMe}
            disabled={busy}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200 transition-colors disabled:opacity-50"
          >
            {tip.cta_label}
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
