import * as React from 'react';
import { Link } from 'react-router-dom';
import { VCard, type VCardSize } from '@/components/ui/vcard';
import type { VCardData } from '@/components/ui/vcard/adapters';
import { cn } from '@/lib/utils';

/**
 * VTID-05110 — a VCard for the social screens, built from adapter data.
 *
 * The whole card is one click target without nesting interactive elements:
 * the title is the real link/button and stretches over the card with an
 * `::after` overlay; actions sit above that overlay (`z-10`) so they keep their
 * own handlers. Keyboard users tab to the title, then to each action.
 */
export interface SocialVCardProps {
  data: VCardData;
  size: VCardSize;
  /** Opens a drawer / runs an in-page action instead of following `data.href`. */
  onOpen?: () => void;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  priority?: boolean;
  /** Body text is shown on spotlight cards only, clamped so rows stay even. */
  showBody?: boolean;
  className?: string;
}

const STRETCH = 'text-start after:absolute after:inset-0 focus-visible:outline-none';

export function SocialVCard({ data, size, onOpen, actions, badge, priority, showBody, className }: SocialVCardProps) {
  let title: React.ReactNode = data.title;
  if (onOpen) {
    title = (
      <button type="button" className={STRETCH} onClick={onOpen}>
        {data.title}
      </button>
    );
  } else if (data.href) {
    title = (
      <Link to={data.href} className={STRETCH}>
        {data.title}
      </Link>
    );
  }

  return (
    <VCard
      size={size}
      media={data.media}
      eyebrow={data.eyebrow}
      title={title}
      meta={data.meta}
      body={showBody && data.body ? <span className="line-clamp-3">{data.body}</span> : undefined}
      actions={actions ? <span className="relative z-10 flex flex-wrap items-center gap-2">{actions}</span> : undefined}
      badge={badge}
      priority={priority}
      data-vcard-key={data.key}
      className={cn('relative focus-within:ring-2 focus-within:ring-ring', className)}
    />
  );
}
