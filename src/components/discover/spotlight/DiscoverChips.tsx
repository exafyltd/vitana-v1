import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * VTID-05109 — inline-start-aligned filter chips (plan §2.4: "filters
 * left-aligned chips, never <Select>s without handlers"). Each chip is a
 * toggle button with `aria-pressed`, so every chip has a handler (SR-26) and
 * a keyboard path (SR-29).
 */
export function ChipBar({ ariaLabel, children, className }: { ariaLabel: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="toolbar" aria-label={ariaLabel} className={cn('flex flex-wrap items-center gap-2', className)} data-discover-chips="">
      {children}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}
