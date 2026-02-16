/**
 * Daily.co video room component
 * VTID-01230: Frontend integration for Daily.co Live Rooms
 */

import { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';

interface DailyVideoRoomProps {
  roomUrl: string;
  onJoined?: () => void;
  onLeft?: () => void;
  onError?: (error: string) => void;
}

export function DailyVideoRoom({ roomUrl, onJoined, onLeft, onError }: DailyVideoRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Wait one tick to avoid Strict Mode double-create race
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !roomUrl || !ready) return;

    // Destroy any lingering global instance first
    const existing = DailyIframe.getCallInstance();
    if (existing) {
      existing.destroy();
    }

    const call = DailyIframe.createFrame(containerRef.current, {
      showLeaveButton: true,
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: '8px',
      },
    });

    let destroyed = false;

    call.on('joined-meeting', () => {
      if (!destroyed) {
        console.log('[Daily] Joined meeting');
        onJoined?.();
      }
    });

    call.on('left-meeting', () => {
      if (!destroyed) {
        console.log('[Daily] Left meeting');
        onLeft?.();
      }
    });

    call.on('error', (error) => {
      if (!destroyed) {
        console.error('[Daily] Error:', error);
        onError?.(error.errorMsg || 'Unknown error');
      }
    });

    call.join({ url: roomUrl }).catch((err) => {
      if (!destroyed) {
        console.error('[Daily] Failed to join:', err);
        onError?.('Failed to join video room');
      }
    });

    return () => {
      destroyed = true;
      try {
        call.destroy();
      } catch (e) {
        console.warn('[Daily] Cleanup error:', e);
      }
    };
  }, [roomUrl, ready]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[600px] bg-black rounded-lg" />
  );
}
