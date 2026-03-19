import React, { Component, useState } from 'react';
import { usePresenceDebug } from '@/hooks/usePresenceDebug';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

class PresenceDebugErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const PresenceDebugPanelInner: React.FC = () => {
  const { debugInfo, showDebug } = usePresenceDebug();
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('presence-debug-dismissed') === 'true';
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('presence-debug-dismissed', 'true');
  };

  if (!showDebug || isDismissed) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-64 z-50 opacity-75 hover:opacity-100 transition-opacity">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Presence Debug</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleDismiss}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
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

const PresenceDebugPanel: React.FC = () => (
  <PresenceDebugErrorBoundary>
    <PresenceDebugPanelInner />
  </PresenceDebugErrorBoundary>
);

export default PresenceDebugPanel;