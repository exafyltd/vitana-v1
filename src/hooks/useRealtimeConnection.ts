import { useState, useEffect } from 'react';
import { realtimeChannel, removeRealtimeChannel } from '@/integrations/supabase/realtime';

interface RealtimeConnectionState {
  isConnected: boolean;
  reconnecting: boolean;
  lastSync: Date;
}

export function useRealtimeConnection(): RealtimeConnectionState {
  const [isConnected, setIsConnected] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [lastSync, setLastSync] = useState(new Date());

  useEffect(() => {
    const channel = realtimeChannel('connection-monitor');

    channel
      .on('system', { event: 'connected' }, () => {
        console.log('✅ Real-time connected');
        setIsConnected(true);
        setReconnecting(false);
        setLastSync(new Date());
      })
      .on('system', { event: 'disconnected' }, () => {
        console.warn('⚠️ Real-time disconnected');
        setIsConnected(false);
        setReconnecting(false);
      })
      .on('system', { event: 'reconnecting' }, () => {
        console.log('🔄 Real-time reconnecting...');
        setReconnecting(true);
      })
      .subscribe();

    return () => {
      removeRealtimeChannel(channel);
    };
  }, []);

  return { isConnected, reconnecting, lastSync };
}
