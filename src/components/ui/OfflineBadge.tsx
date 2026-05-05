/**
 * Offline Badge Component
 * 
 * Shows a subtle indicator when the app is offline.
 * Positioned in the header area, non-intrusive but visible.
 */

import { WifiOff } from 'lucide-react';
import { useOffline } from '@/context/OfflineProvider';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';

interface OfflineBadgeProps {
  className?: string;
}

export function OfflineBadge({ className }: OfflineBadgeProps) {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full',
        'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        'text-xs font-medium animate-pulse',
        className
      )}
    >
      <WifiOff className="h-3 w-3" />
      <span>{t('screens.ui.offline')}</span>
    </div>
  );
}
