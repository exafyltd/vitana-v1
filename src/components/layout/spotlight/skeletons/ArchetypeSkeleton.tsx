import { VCardSkeleton } from '@/components/ui/vcard';
import { Skeleton } from '@/components/ui/skeleton';
import type { Archetype } from '../archetypes';

/**
 * VTID-05105 — loading state in the shape of the screen that is coming
 * (contract SR-20): never a page spinner, never a blank panel.
 */
export function ArchetypeSkeleton({ archetype }: { archetype: Archetype }) {
  const label = { 'aria-busy': true, 'data-archetype-skeleton': archetype } as const;
  switch (archetype) {
    case 'focus-feed':
    case 'detail':
      return (
        <div {...label} className="flex flex-col gap-5">
          <VCardSkeleton size="spotlight" />
          <VCardSkeleton size="spotlight" className="opacity-60" />
        </div>
      );
    case 'storefront':
      return (
        <div {...label} className="flex flex-col gap-6">
          <VCardSkeleton size="spotlight" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <VCardSkeleton key={i} size="standard" />
            ))}
          </div>
        </div>
      );
    case 'collection':
      return (
        <div {...label} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <VCardSkeleton key={i} size="standard" />
          ))}
        </div>
      );
    case 'dashboard':
      return (
        <div {...label} className="flex flex-col gap-4">
          <VCardSkeleton size="spotlight" />
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <VCardSkeleton key={i} size="standard" />
            ))}
          </div>
        </div>
      );
    case 'conversation':
      return (
        <div {...label} className="flex gap-4">
          <div className="flex w-1/3 flex-col gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <VCardSkeleton key={i} size="row" />
            ))}
          </div>
          <Skeleton className="h-96 flex-1 rounded-vcard" />
        </div>
      );
    case 'form':
      return (
        <div {...label} className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      );
    case 'workspace':
      return (
        <div {...label} className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <VCardSkeleton key={i} size="row" />
          ))}
        </div>
      );
    case 'immersive':
      return <Skeleton {...label} className="h-screen w-full rounded-none" />;
  }
}
