import * as React from 'react';
import { PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';
import type { SpotlightWidth } from './archetypes';

/**
 * VTID-05105 — the Spotlight content frame: one stage column, plus an optional
 * sticky context rail.
 *
 * The root is a CSS container (`container-type: inline-size`, see `.sp-layout`
 * in src/index.css). The rail shows when the MAIN AREA is >= 1060 px — a
 * container query, not a viewport breakpoint, so collapsing the sidebar is
 * accounted for. Below that the rail is reachable through a toggle sheet that
 * opens from the inline-end side (away from the ORB).
 */
export interface SpotlightLayoutProps {
  width?: SpotlightWidth;
  rail?: React.ReactNode;
  /** Accessible name of the rail landmark. */
  railLabel?: string;
  className?: string;
  children: React.ReactNode;
}

function inlineEndSide(): 'left' | 'right' {
  return typeof document !== 'undefined' && document.documentElement.dir === 'rtl' ? 'left' : 'right';
}

export function SpotlightLayout({ width = 'stage-rail', rail, railLabel, className, children }: SpotlightLayoutProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const hasRail = width === 'stage-rail' && rail != null;
  const label = railLabel ?? t('spotlight.rail.label');

  return (
    <div className={cn('sp-layout', className)} data-width={width} data-spotlight-layout="">
      {hasRail && (
        <div className="sp-rail-toggle mb-3">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-full" onClick={() => setSheetOpen(true)}>
            <PanelRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            {t('spotlight.rail.open')}
          </Button>
        </div>
      )}
      <div className="sp-grid">
        <div className="sp-stage min-w-0" data-spotlight-stage="">
          {children}
        </div>
        {hasRail && (
          <aside className="sp-rail" aria-label={label} data-spotlight-rail="">
            <div className="flex flex-col gap-3">{rail}</div>
          </aside>
        )}
      </div>
      {hasRail && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side={inlineEndSide()} className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{t('spotlight.rail.title')}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 flex flex-col gap-3">{rail}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
