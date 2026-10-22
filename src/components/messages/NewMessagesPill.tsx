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
  /** Where keyboard focus goes after the jump (the pill itself disappears). */
  focusAfterJump?: () => HTMLElement | null;
}

export function newMessagesLabel(count: number): string {
  if (count <= 0) return t('inbox.newMessages.none');
  return count === 1 ? t('inbox.newMessages.one') : t('inbox.newMessages.other', { count });
}

const NewMessagesPill: React.FC<NewMessagesPillProps> = ({ count, onClick, className, style, focusAfterJump }) => {
  const label = count > 0 ? newMessagesLabel(count) : '';
  const handleClick = () => {
    onClick();
    // The pill unmounts once the count is cleared: keep keyboard focus in the chat.
    const next = focusAfterJump?.();
    if (next) next.focus({ preventScroll: true });
  };
  return (
    <>
      {/* Always mounted, so the first "N new messages" is announced too. */}
      <span className="sr-only" role="status" aria-live="polite" data-testid="new-messages-status">{label}</span>
      {count > 0 && (
        <div className={cn('pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center', className)} style={style}>
          <button
            type="button"
            onClick={handleClick}
            className="pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-testid="new-messages-pill"
          >
            <ArrowDown className="h-4 w-4" aria-hidden />
            <span>{label}</span>
          </button>
        </div>
      )}
    </>
  );
};

export default NewMessagesPill;
