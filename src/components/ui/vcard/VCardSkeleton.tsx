import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { VCardMediaRatio, VCardSize } from './VCard';

/**
 * VTID-05105 — placeholder in the exact shape of a VCard of the same size, so
 * nothing jumps when the real card arrives (contract SR-20 / SR-21).
 */
export function VCardSkeleton({ size, ratio, className }: { size: VCardSize; ratio?: VCardMediaRatio; className?: string }) {
  const stacked = size === 'spotlight' || size === 'standard';
  if (stacked) {
    const media = size === 'standard' ? 'aspect-landscape' : ratio === 'portrait' ? 'aspect-portrait' : 'aspect-video';
    return (
      <div
        data-vcard-size={size}
        data-vcard-skeleton=""
        aria-hidden="true"
        className={cn('flex flex-col overflow-hidden rounded-vcard border bg-card', size === 'spotlight' ? 'shadow-vcard-raised' : 'shadow-vcard', className)}
      >
        <Skeleton className={cn('w-full rounded-none', media)} />
        <div className={cn('flex flex-col gap-2', size === 'spotlight' ? 'p-5' : 'p-4')}>
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }
  return (
    <div
      data-vcard-size={size}
      data-vcard-skeleton=""
      aria-hidden="true"
      className={cn(
        'flex items-center gap-3 rounded-vcard-sm border bg-card shadow-vcard',
        size === 'compact' ? 'min-h-vcard-compact p-2.5' : 'px-3 py-2',
        className,
      )}
    >
      <Skeleton className={cn('shrink-0', size === 'compact' ? 'size-vcard-thumb rounded-lg' : 'size-vcard-row-thumb rounded-md')} />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
