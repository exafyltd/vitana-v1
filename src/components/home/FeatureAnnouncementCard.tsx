/**
 * FeatureAnnouncementCard — shared "product-discovery" post-card family for
 * the MAXINA News Feed. Two variants share one visual language (radius,
 * spacing, typography hierarchy, CTA style) so they read as one family, but
 * are immediately distinguishable:
 *   - "brand-new-feature": celebratory launch announcement — gradient icon
 *     badge with a soft glow, a "NEW" pill, and a closing "Happy testing" line.
 *   - "did-you-know-feature": calmer daily tip — lightbulb icon on a flat
 *     tint, no badge, no closing line, more informational framing.
 *
 * `featureTitle` and `description` are feature-specific copy the caller
 * supplies already resolved to the viewer's locale (mirrors how
 * NewsArticleCard takes `title`/`description` as plain strings) — this
 * component only owns the surrounding "chrome" text, which comes from
 * src/i18n/{de,en}/featureAnnouncementCard.json.
 */
import { type ReactNode } from 'react';
import { ArrowRight, Lightbulb, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { t } from '@/lib/i18n-toast';
import { cn } from '@/lib/utils';

export type FeatureAnnouncementVariant = 'brand-new-feature' | 'did-you-know-feature';

export interface FeatureAnnouncementCardProps {
  variant: FeatureAnnouncementVariant;
  /** Feature name, e.g. "Voice Journaling" — already localized. */
  featureTitle: string;
  /** One or two short sentences on what the user can now do — already localized. */
  description: string;
  /** Route to open on tap/Enter (deep link to the feature). */
  deepLink: string;
  /** Optional icon/illustration override; defaults to the variant's glyph. */
  icon?: ReactNode;
  /** Fires after navigation is triggered — analytics hook. */
  onOpen?: () => void;
}

const VARIANT_COPY: Record<
  FeatureAnnouncementVariant,
  { eyebrowKey: string; introKey: string; ctaKey: string; closingKey?: string; badgeKey?: string }
> = {
  'brand-new-feature': {
    eyebrowKey: 'featureAnnouncementCard.brandNew.eyebrow',
    introKey: 'featureAnnouncementCard.brandNew.intro',
    ctaKey: 'featureAnnouncementCard.brandNew.cta',
    closingKey: 'featureAnnouncementCard.brandNew.closing',
    badgeKey: 'featureAnnouncementCard.brandNew.badge',
  },
  'did-you-know-feature': {
    eyebrowKey: 'featureAnnouncementCard.didYouKnow.eyebrow',
    introKey: 'featureAnnouncementCard.didYouKnow.intro',
    ctaKey: 'featureAnnouncementCard.didYouKnow.cta',
  },
};

const VARIANT_STYLE: Record<
  FeatureAnnouncementVariant,
  { shell: string; iconWrap: string; iconColor: string; eyebrowColor: string; ctaColor: string; DefaultIcon: typeof Sparkles }
> = {
  'brand-new-feature': {
    shell: 'border-sys-feature-new-card-border bg-sys-feature-new-card',
    iconWrap:
      'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_0_0_5px_hsl(var(--sys-feature-new-accent)/0.15)]',
    iconColor: 'text-white',
    eyebrowColor: 'text-sys-feature-new-accent',
    ctaColor: 'text-sys-feature-new-accent group-hover:text-sys-feature-new-accent/80',
    DefaultIcon: Sparkles,
  },
  'did-you-know-feature': {
    shell: 'border-sys-feature-tip-card-border bg-sys-feature-tip-card',
    iconWrap: 'bg-sys-feature-tip-tint',
    iconColor: 'text-sys-feature-tip-accent',
    eyebrowColor: 'text-sys-feature-tip-accent',
    ctaColor: 'text-sys-feature-tip-accent group-hover:text-sys-feature-tip-accent/80',
    DefaultIcon: Lightbulb,
  },
};

export function FeatureAnnouncementCard({
  variant,
  featureTitle,
  description,
  deepLink,
  icon,
  onOpen,
}: FeatureAnnouncementCardProps) {
  const navigate = useNavigate();
  const copy = VARIANT_COPY[variant];
  const style = VARIANT_STYLE[variant];
  const { DefaultIcon } = style;

  const open = () => {
    onOpen?.();
    navigate(deepLink);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-md cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'animate-fade-in',
        style.shell,
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            style.iconWrap,
          )}
          aria-hidden="true"
        >
          {icon ?? <DefaultIcon className={cn('h-4 w-4', style.iconColor)} />}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 flex-wrap">
          <span className={cn('text-sm font-bold leading-tight', style.eyebrowColor)}>{t(copy.eyebrowKey)}</span>
          {copy.badgeKey && (
            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              {t(copy.badgeKey)}
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 truncate text-base font-semibold leading-snug text-foreground">{featureTitle}</p>

      <p className="mt-1 text-sm font-medium text-muted-foreground">{t(copy.introKey)}</p>
      <p className="mt-0.5 text-sm leading-relaxed text-foreground line-clamp-3 whitespace-pre-wrap break-words">
        {description}
      </p>

      <span
        className={cn(
          'mt-3 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors',
          style.ctaColor,
        )}
      >
        {t(copy.ctaKey)}
        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
      </span>

      {copy.closingKey && (
        <p className="mt-2 text-xs text-muted-foreground">{t(copy.closingKey)}</p>
      )}
    </div>
  );
}

/** Convenience wrapper — pins `variant` to "brand-new-feature". */
export function BrandNewFeatureCard(props: Omit<FeatureAnnouncementCardProps, 'variant'>) {
  return <FeatureAnnouncementCard {...props} variant="brand-new-feature" />;
}

/** Convenience wrapper — pins `variant` to "did-you-know-feature". */
export function DidYouKnowFeatureCard(props: Omit<FeatureAnnouncementCardProps, 'variant'>) {
  return <FeatureAnnouncementCard {...props} variant="did-you-know-feature" />;
}
