/**
 * VTID-05085 — one Unified Card System card: the unchanged
 * VitanaRecommendationCard shell (ORB + "Vitana" header, 138 px, same type)
 * with the card's accent tint and its shaped action button in the widget
 * slot. Every enrichment (E*) and new feature (F*) card renders through this.
 *
 * Copy: a server-localized `title`/`description` wins (GET enrichment-cards
 * returns them in the member's locale); otherwise the card's own catalog keys.
 */
import { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { VitanaRecommendationCard } from '@/components/vitana/VitanaRecommendationCard';
import { VitanaCardActionButton } from '@/components/vitana/VitanaCardActionButton';
import type { VitanaFeature } from '@/components/vitana/VitanaRecommendationHeader';
import { ACCENT_CLASSES, CARD_STYLE, type VitanaCardType } from '@/components/vitana/vitana-card-catalog';

export interface VitanaActionCardCopy {
  eyebrowKey: string;
  titleKey: string;
  descriptionKey: string;
  actionKey: string;
}

export interface VitanaActionCardProps {
  cardType: VitanaCardType;
  feature: VitanaFeature;
  copy: VitanaActionCardCopy;
  icon: LucideIcon;
  /** Server-localized strings (optional). */
  title?: string;
  description?: string;
  onAction: () => void;
  /** Card body tap; defaults to the action. */
  onOpen?: () => void;
  /** Absent → no X (e.g. a feature card shared in a chat). */
  onDismiss?: () => void;
  busy?: boolean;
  /** Sheets/popups the card owns (rendered outside the card's click area). */
  children?: ReactNode;
}

export function VitanaActionCard({
  cardType,
  feature,
  copy,
  icon,
  title,
  description,
  onAction,
  onOpen,
  onDismiss,
  busy,
  children,
}: VitanaActionCardProps) {
  const { accent, shape } = CARD_STYLE[cardType];
  const headline = title?.trim() || t(copy.titleKey);
  const subtext = description?.trim() || t(copy.descriptionKey);

  return (
    <>
      <div data-vitana-card={cardType} className="contents">
        <VitanaRecommendationCard
          feature={feature}
          eyebrow={t(copy.eyebrowKey)}
          onOpen={onOpen ?? onAction}
          onDismiss={onDismiss}
          dismissLabel={t('screens.vitanaIdentity.dismissCard')}
          accentClassName={ACCENT_CLASSES[accent].border}
          widgetInteractive
          widget={
            <VitanaCardActionButton
              shape={shape}
              icon={icon}
              label={t(copy.actionKey)}
              accent={accent}
              onClick={onAction}
              disabled={busy}
              data-testid={`vitana-card-action-${cardType}`}
            />
          }
        >
          <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">{headline}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{subtext}</p>
        </VitanaRecommendationCard>
      </div>
      {children}
    </>
  );
}
