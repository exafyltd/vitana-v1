import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * VTID-05117 — one settings line on a Spotlight `form` screen: label and
 * description at the inline start, the control at the inline end (mirrors in
 * RTL through flex order, no physical direction).
 */
export function SettingRow({
  title,
  description,
  control,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  control: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)} data-setting-row="">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
