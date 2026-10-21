/**
 * VTID-05319 (messenger-ux-v2/ui-scroll-anchoring) — floating "↓ N new
 * messages" button. Shown while the member reads earlier messages and new ones
 * arrive; a tap (or Enter/Space) goes to the newest message.
 */
import React from 'react';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';

interface NewMessagesPillProps {
  count: number;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function newMessagesLabel(count: number): string {
  if (count <= 0) return t('inbox.newMessages.none');
  return count === 1 ? t('inbox.newMessages.one') : t('inbox.newMessages.other', { count });
}

const NewMessagesPill: React.FC<NewMessagesPillProps> = ({ count, onClick, className, style }) => {
  if (count <= 0) return null;
  const label = newMessagesLabel(count);
  return (
    <div className={cn('pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center', className)} style={style}>
      <button
        type="button"
        onClick={onClick}
        className="pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        data-testid="new-messages-pill"
        aria-live="polite"
      >
        <ArrowDown className="h-4 w-4" aria-hidden />
        <span>{label}</span>
      </button>
    </div>
  );
};

export default NewMessagesPill;
