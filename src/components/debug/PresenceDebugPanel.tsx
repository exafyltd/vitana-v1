import React from 'react';
import { usePresenceDebug } from '@/hooks/usePresenceDebug';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PresenceDebugPanel: React.FC = () => {
  const { debugInfo, showDebug } = usePresenceDebug();

  if (!showDebug) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-64 z-50 opacity-75 hover:opacity-100 transition-opacity">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Presence Debug</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-1">
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={
            debugInfo.connectionStatus === 'connected' ? 'text-emerald-500' :
            debugInfo.connectionStatus === 'connecting' ? 'text-amber-500' : 'text-red-500'
          }>
            {debugInfo.connectionStatus}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Users:</span>
          <span>{debugInfo.totalUsers}</span>
        </div>
        <div className="flex justify-between">
          <span>Retries:</span>
          <span>{debugInfo.reconnectAttempts}</span>
        </div>
        {debugInfo.lastConnected && (
          <div className="flex justify-between">
            <span>Connected:</span>
            <span>{Math.floor((Date.now() - debugInfo.lastConnected) / 1000)}s ago</span>
          </div>
        )}
        {debugInfo.realtimeLatency && (
          <div className="flex justify-between">
            <span>Latency:</span>
            <span>{debugInfo.realtimeLatency}ms</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PresenceDebugPanel;