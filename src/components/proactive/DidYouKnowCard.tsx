/**
 * Did-You-Know Tour — silent-fallback Card (BOOTSTRAP-DYK-TOUR)
 *
 * Shows the next eligible Index-centric tip when ORB isn't actively speaking.
 * Voice-first delivery via ORB is wired separately in Phase 1b on the gateway;
 * this card is the fallback for muted / mobile-WebView / pre-ORB sessions.
 *
 * VTID-05143: rendered on the one Unified Card System shell
 * (VitanaRecommendationCard — ORB + "Vitana" header, 138 px, standard type),
 * indigo accent, pill action button in the widget slot. The tour's pacing
 * choices (this tip / not today / stop the tour), which used to sit behind a
 * separate ⋮ menu, now sit behind the card's X, so the header is identical to
 * every other card and no choice is lost.
 *
 * Plan: .claude/plans/proactive-did-you-generic-sifakis.md (vitana-platform)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import { useDidYouKnowTip } from '@/hooks/useDidYouKnowTip';
import { t } from '@/lib/i18n-toast';
import { VitanaRecommendationCard } from '@/components/vitana/VitanaRecommendationCard';
import { VitanaCardActionButton } from '@/components/vitana/VitanaCardActionButton';
import { ACCENT_CLASSES, CARD_STYLE } from '@/components/vitana/vitana-card-catalog';
import { splitTipCopy } from '@/components/proactive/split-tip-copy';

const STYLE = CARD_STYLE.F8; // VTID-05086: Unified Card System accent + button shape

export interface DidYouKnowCardProps {
  /** VTID-05086: a card shared in a chat shows no X / pacing menu. */
  hideDismiss?: boolean;
}

export function DidYouKnowCard({ hideDismiss = false }: DidYouKnowCardProps = {}) {
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
      } catch {
        // sessionStorage unavailable (private mode) — navigation still proceeds.
      }
      navigate(url);
      return;
    }
    // VTID-05212: no destination. When accept() recorded the tip it has already
    // hidden it (the card unmounts); when it recorded nothing (no tip or no
    // session yet) the button must not stay disabled forever. No decline here:
    // an accepted tip would get a second, contradicting event.
    setBusy(false);
  };

  const { headline, subtext } = splitTipCopy(tip.card_copy);

  return (
    <div className="w-full" role="status" aria-live="polite" data-testid="dyk-card">
      <VitanaRecommendationCard
        feature="did-you-know"
        eyebrow={t('screens.proactive.didYouKnow')}
        onOpen={handleShowMe}
        dismissLabel={t('screens.proactive.dismissTip')}
        dismissMenu={
          hideDismiss
            ? undefined
            : [
                { label: t('screens.proactive.dismissTip'), onSelect: () => decline('tip') },
                { label: t('screens.proactive.notToday'), onSelect: () => decline('today') },
                { label: t('screens.proactive.stopTour'), onSelect: () => decline('stop') },
              ]
        }
        accentClassName={ACCENT_CLASSES[STYLE.accent].border}
        widgetInteractive
        widget={
          <VitanaCardActionButton
            shape={STYLE.shape}
            accent={STYLE.accent}
            icon={Lightbulb}
            label={tip.cta_label}
            onClick={handleShowMe}
            disabled={busy}
            data-testid="vitana-card-action-F8"
          />
        }
      >
        <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">{headline}</p>
        {subtext && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{subtext}</p>}
      </VitanaRecommendationCard>
    </div>
  );
}
