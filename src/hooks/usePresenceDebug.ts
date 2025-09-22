import { useEffect, useState } from 'react';
import { useUserPresence } from './useUserPresence';

export interface PresenceDebugInfo {
  totalUsers: number;
  connectionStatus: string;
  reconnectAttempts: number;
  lastConnected?: number;
  realtimeLatency?: number;
}

export function usePresenceDebug() {
  const { connection, presenceCount } = useUserPresence();
  const [debugInfo, setDebugInfo] = useState<PresenceDebugInfo>({
    totalUsers: 0,
    connectionStatus: 'unknown',
    reconnectAttempts: 0,
  });

  useEffect(() => {
    setDebugInfo({
      totalUsers: presenceCount,
      connectionStatus: connection.status,
      reconnectAttempts: connection.reconnectAttempts,
      lastConnected: connection.lastConnected,
      realtimeLatency: connection.lastConnected ? Date.now() - connection.lastConnected : undefined,
    });
  }, [connection, presenceCount]);

  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    debugInfo,
    showDebug: isDevelopment,
  };
}