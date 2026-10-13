import type * as React from 'react';

/**
 * VTID-05111 — makes a VCard behave like a button (click + Enter/Space) with a
 * visible focus ring (contract SR-26, SR-29). Spread onto the VCard; pass any
 * extra classes through `cn(props.className, …)`.
 */
export function cardButtonProps(onActivate: () => void, label?: string) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': label,
    onClick: (e: React.MouseEvent) => {
      // Buttons and links inside the card keep their own action.
      if ((e.target as HTMLElement).closest('button, a') && e.target !== e.currentTarget) return;
      onActivate();
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate();
      }
    },
    className:
      'cursor-pointer transition-shadow hover:shadow-vcard-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  };
}
