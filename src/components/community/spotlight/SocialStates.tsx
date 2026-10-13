import { AlertCircle, type LucideIcon } from 'lucide-react';
import { I18nEmptyState } from '@/components/ui/i18n-empty-state';
import { VCardSkeleton } from '@/components/ui/vcard';

/**
 * VTID-05110 — loading / empty / error states for the social Spotlight screens
 * (contract SR-20, SR-25), built only from the shared components: VCard
 * skeletons in the shape of what is coming, and the catalog-keyed
 * `I18nEmptyState`.
 */
export function StageListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-4" data-social-skeleton="">
      <VCardSkeleton size="spotlight" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }, (_, i) => (
          <VCardSkeleton key={i} size="row" />
        ))}
      </div>
    </div>
  );
}

export function GridSkeleton({ cols, count }: { cols: 2 | 3; count: number }) {
  return (
    <div aria-busy="true" className={cols === 3 ? 'grid grid-cols-3 gap-4' : 'grid grid-cols-2 gap-4'} data-social-skeleton="">
      {Array.from({ length: count }, (_, i) => (
        <VCardSkeleton key={i} size="standard" />
      ))}
    </div>
  );
}

export interface EmptySpec {
  titleKey: string;
  descriptionKey?: string;
  actionKey?: string;
  onAction?: () => void;
  Icon?: LucideIcon;
}

export function SocialEmpty({ spec }: { spec: EmptySpec }) {
  return (
    <div className="rounded-vcard border border-dashed bg-surface-raised" data-social-empty="">
      <I18nEmptyState
        Icon={spec.Icon}
        titleKey={spec.titleKey}
        descriptionKey={spec.descriptionKey}
        actionKey={spec.actionKey}
        onAction={spec.onAction}
      />
    </div>
  );
}

export function SocialError({ onRetry }: { onRetry?: () => void }) {
  return (
    <SocialEmpty
      spec={{
        Icon: AlertCircle,
        titleKey: 'spotlightSocial.common.errorTitle',
        descriptionKey: 'spotlightSocial.common.errorDesc',
        actionKey: onRetry ? 'spotlightSocial.common.retry' : undefined,
        onAction: onRetry,
      }}
    />
  );
}
