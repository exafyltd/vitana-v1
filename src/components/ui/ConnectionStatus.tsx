import { useRealtimeConnection } from '@/hooks/useRealtimeConnection';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { t } from '@/lib/i18n-toast';

export function ConnectionStatus() {
  const { isConnected, reconnecting } = useRealtimeConnection();

  if (isConnected && !reconnecting) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
        <Wifi className="w-3 h-3" />
        <span>{t('screens.ui.live')}</span>
      </div>
    );
  }

  if (reconnecting) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>{t('screens.ui.reconnecting')}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
      <WifiOff className="w-3 h-3" />
      <span>{t('screens.ui.offline')}</span>
    </div>
  );
}
