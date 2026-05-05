/**
 * DataRenderer Component
 * 
 * Handles cache-first rendering pattern:
 * - If cache exists → render immediately (no skeleton)
 * - If no cache + loading → show skeleton
 * - If no cache + not loading → show empty state
 * 
 * Also supports offline mode by showing cached data with offline indicator.
 */

import React from 'react';
import { useOffline } from '@/context/OfflineProvider';
import { OfflineBadge } from './OfflineBadge';
import { t } from '@/lib/i18n-toast';

interface DataRendererProps<T> {
  data: T | undefined;
  isLoading: boolean;
  isFetching?: boolean;
  error?: Error | null;
  skeleton: React.ReactNode;
  emptyState?: React.ReactNode;
  errorState?: React.ReactNode;
  children: (data: T) => React.ReactNode;
  showOfflineIndicator?: boolean;
}

export function DataRenderer<T>({
  data,
  isLoading,
  isFetching = false,
  error,
  skeleton,
  emptyState,
  errorState,
  children,
  showOfflineIndicator = true,
}: DataRendererProps<T>) {
  const { isOffline } = useOffline();

  // Error state (only show if no cached data)
  if (error && data === undefined) {
    return (
      <>
        {errorState || (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-destructive">{t('screens.ui.failedLoadData')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error.message || 'Please try again later'}
            </p>
          </div>
        )}
      </>
    );
  }

  // Cache exists → render immediately
  if (data !== undefined) {
    // Check if data is empty array/object
    const isEmpty = Array.isArray(data) 
      ? data.length === 0 
      : typeof data === 'object' && data !== null && Object.keys(data).length === 0;
    
    if (isEmpty && emptyState && !isLoading) {
      return <>{emptyState}</>;
    }

    return (
      <div className="relative">
        {/* Offline indicator when showing cached data while offline */}
        {isOffline && showOfflineIndicator && (
          <div className="absolute top-2 right-2 z-10">
            <OfflineBadge />
          </div>
        )}
        {children(data)}
      </div>
    );
  }

  // No cache + loading → show skeleton
  if (isLoading) {
    return <>{skeleton}</>;
  }

  // No cache + offline → show offline empty state
  if (isOffline) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <OfflineBadge className="mb-4" />
        <p className="text-muted-foreground">{t('screens.ui.noCachedDataAvailable')}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Connect to the internet to load content
        </p>
      </div>
    );
  }

  // No data, not loading → show empty state
  return <>{emptyState || null}</>;
}

/**
 * Simple skeleton wrapper for common patterns
 */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-24 bg-muted/50 rounded-xl animate-pulse"
        />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <div className="h-10 w-10 rounded-full bg-muted/50 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-muted/50 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-muted/50 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 6, cols = 3 }: { count?: number; cols?: number }) {
  return (
    <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-48 bg-muted/50 rounded-xl animate-pulse"
        />
      ))}
    </div>
  );
}
