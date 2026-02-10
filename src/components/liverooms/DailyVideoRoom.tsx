/**
 * Daily.co video room component
 * VTID-01230: Frontend integration for Daily.co Live Rooms
 */

import { useEffect, useRef } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';

interface DailyVideoRoomProps {
  roomUrl: string;
  onJoined?: () => void;
  onLeft?: () => void;
  onError?: (error: string) => void;
}

export function DailyVideoRoom({ roomUrl, onJoined, onLeft, onError }: DailyVideoRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);

  useEffect(() => {
    if (!containerRef.current || !roomUrl) return;

    // Create Daily call object
    const call = DailyIframe.createFrame(containerRef.current, {
      showLeaveButton: true,
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: '8px',
      },
    });

    callRef.current = call;

    // Event listeners
    call.on('joined-meeting', () => {
      console.log('[Daily] Joined meeting');
      onJoined?.();
    });

    call.on('left-meeting', () => {
      console.log('[Daily] Left meeting');
      onLeft?.();
    });

    call.on('error', (error) => {
      console.error('[Daily] Error:', error);
      onError?.(error.errorMsg || 'Unknown error');
    });

    // Join the room
    call.join({ url: roomUrl }).catch((err) => {
      console.error('[Daily] Failed to join:', err);
      onError?.('Failed to join video room');
    });

    // Cleanup
    return () => {
      if (callRef.current) {
        callRef.current.destroy();
        callRef.current = null;
      }
    };
  }, [roomUrl, onJoined, onLeft, onError]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[600px] bg-black rounded-lg" />
  );
}
